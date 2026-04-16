import { GoogleGenerativeAI, FunctionCallingMode } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { aiTools, handleToolCall } from '@/lib/ai/tools';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── GET Handler (대화 이력 조회) ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const [rows] = await pool.query(
      `SELECT msg_no as id, role, content as text, tools_used, UNIX_TIMESTAMP(created_at) * 1000 as created_at
       FROM T_AI_CHAT_MESSAGE
       WHERE user_id = ?
       ORDER BY msg_no ASC`,
      [session.user_id]
    );

    const history = (rows as any[]).map(r => ({
      id: r.id.toString(),
      role: r.role,
      text: r.text,
      toolsUsed: r.tools_used ? JSON.parse(r.tools_used) : [],
      created_at: Number(r.created_at)
    }));

    return NextResponse.json(history);
  } catch (err) {
    console.error('Failed to fetch AI chat history', err);
    return NextResponse.json({ error: '대화 기록을 불러오는데 실패했습니다.' }, { status: 500 });
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }

  const body = await req.json();
  const { messages } = body as { messages: { role: 'user' | 'model' | 'assistant'; text: string }[] };

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: '메시지가 없습니다.' }, { status: 400 });
  }

  // 사용자의 새 메시지 저장
  const lastMessageText = messages[messages.length - 1].text;
  try {
    await pool.query(
      'INSERT INTO T_AI_CHAT_MESSAGE (user_id, role, content) VALUES (?, ?, ?)',
      [session.user_id, 'user', lastMessageText]
    );
  } catch (e) {
    console.error('Failed to save user message to DB', e);
  }

  // 스트리밍 응답 설정
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let fullAssistantText = '';
      const executedTools: string[] = [];

      try {
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          tools: aiTools,
          toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
          systemInstruction: `당신은 sz-dev 커뮤니티의 AI 어시스턴트입니다.
사용자의 질문에 친절하게 한국어로 답변합니다.
게시판 정보, 최근 글, 내용 검색 등이 필요하면 제공된 도구를 적극적으로 활용하세요.
도구로 얻은 정보를 바탕으로 자연스럽고 유용한 답변을 작성하세요.
게시물 목록을 보여줄 때는 제목과 작성일을 포함해서 보기 좋게 정리해주세요.`,
        });

        // 대화 기록을 Gemini 형식으로 변환 (assistant → model)
        const history = messages.slice(0, -1).map(m => ({
          role: m.role === 'assistant' ? 'model' : m.role,
          parts: [{ text: m.text }],
        }));

        const chat = model.startChat({ history });

        // 첫 응답 요청
        let result = await chat.sendMessage(lastMessageText);
        let response = result.response;

        // Tool Calling 루프 (AI가 도구 호출을 원하면 실행 후 재요청)
        while (response.candidates?.[0]?.content?.parts?.some(p => p.functionCall)) {
          const parts = response.candidates![0].content.parts;
          const toolResults = [];

          for (const part of parts) {
            if (part.functionCall) {
              const { name, args } = part.functionCall;
              send({ type: 'tool_call', tool: name }); // 프론트에 "검색 중..." 알림
              executedTools.push(name);

              const toolResult = await handleToolCall(name, (args as Record<string, unknown>) ?? {});
              toolResults.push({
                functionResponse: { name, response: { result: toolResult } },
              });
            }
          }

          // 도구 결과를 AI에 전달
          result = await chat.sendMessage(toolResults);
          response = result.response;
        }

        // 최종 텍스트 스트리밍
        const finalText = response.text();
        const chunkSize = 5;
        for (let i = 0; i < finalText.length; i += chunkSize) {
          send({ type: 'text', chunk: finalText.slice(i, i + chunkSize) });
          await new Promise(r => setTimeout(r, 15));
        }

        fullAssistantText = finalText;

        send({ type: 'done' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '알 수 없는 오류';
        send({ type: 'error', message: msg });
        fullAssistantText = `오류 발생: ${msg}`; // Save error to history as well
      } finally {
        // AI 응답 저장
        if (fullAssistantText || executedTools.length > 0) {
          try {
            await pool.query(
              'INSERT INTO T_AI_CHAT_MESSAGE (user_id, role, content, tools_used) VALUES (?, ?, ?, ?)',
              [session.user_id, 'assistant', fullAssistantText, JSON.stringify(executedTools)]
            );
          } catch (e) {
            console.error('Failed to save assistant message to DB', e);
          }
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
