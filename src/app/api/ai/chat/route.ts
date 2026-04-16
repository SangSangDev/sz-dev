import { GoogleGenerativeAI, FunctionCallingMode } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { aiTools, handleToolCall } from '@/lib/ai/tools';
import { encryptMessage, decryptMessage } from '@/lib/encryption';

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
      text: decryptMessage(r.text),
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
      [session.user_id, 'user', encryptMessage(lastMessageText)]
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
          model: 'gemini-2.5-flash-lite',
          tools: aiTools,
          toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
          systemInstruction: `당신은 SZ WOKRS AI 어시스턴트입니다.
  사용자의 질문에 친절하게 한국어로 답변합니다.
  [개념 숙지]
  - 게시판(Board): 특정 주제의 '게시글(Post)'들을 모아두는 큰 범주나 폴더입니다.
  - 게시글(Post): 각 게시판 내부에 사용자들이 개별적으로 작성한 상세 글입니다.
  
  [동작 규칙]
  - 게시판 종류나 목록에 대해 답변할 때는 절대로 데이터베이스 내부 코드(예: B_HANG0E 등 board_code)를 노출하지 말고, 반드시 한글로 된 '웹 표기 게시판 이름(board_name / menu_name)'으로 자연스럽게 안내하세요.
  - 제공된 도구들을 적극적으로 활용하여 게시판 목록 조회, 최신 글 확인, 키워드 검색뿐만 아니라 특정 게시물의 전체 상세 본문 내용(get_post_content)까지 자유롭게 열람하고 요약해 줄 수 있습니다. 
  - 사용자가 특정 게시글이나 정보의 내용을 물어보면, 본문 조회 도구를 호출한 뒤 내용을 파악하여 상세히 보고/요약해 주세요.
  - 게시물 목록을 보여줄 때는 게시판 이름, 제목과 작성일을 포함해서 보기 좋게 정리해주시고, 유용한 답변을 작성하세요.`,
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
              [session.user_id, 'assistant', encryptMessage(fullAssistantText), JSON.stringify(executedTools)]
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
