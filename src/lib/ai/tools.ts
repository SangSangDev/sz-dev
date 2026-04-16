import { Tool, SchemaType } from '@google/generative-ai';
import pool from '@/lib/db';

export const aiTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'search_board_posts',
        description: '게시판에서 키워드로 제목이나 내용을 검색합니다. 사용자가 특정 정보나 게시물을 찾을 때 호출하세요.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            keyword: {
              type: SchemaType.STRING,
              description: '검색할 키워드 (제목/내용에서 검색)',
            },
            board_code: {
              type: SchemaType.STRING,
              description: '(선택) 특정 게시판 코드 (예: NOTICE, FREE). 생략하면 전체 게시판 검색.',
            },
            limit: {
              type: SchemaType.NUMBER,
              description: '(선택) 최대 결과 수. 기본값 5, 최대 20.',
            },
          },
          required: ['keyword'],
        },
      },
      {
        name: 'get_recent_posts',
        description: '특정 게시판 또는 전체 게시판의 최신 게시물 목록을 가져옵니다. 최근 글이나 현황을 물을 때 호출하세요.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            board_code: {
              type: SchemaType.STRING,
              description: '(선택) 게시판 코드. 생략하면 전체 게시판 최신 글.',
            },
            limit: {
              type: SchemaType.NUMBER,
              description: '(선택) 가져올 게시물 수. 기본값 5, 최대 20.',
            },
          },
          required: [],
        },
      },
      {
        name: 'list_boards',
        description: '현재 운영 중인 게시판 목록과 각 게시판의 게시물 수를 조회합니다. 어떤 게시판이 있는지 물을 때 호출하세요.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_post_content',
        description: '특정 게시물의 제목, 본문 내용, 작성자, 작성일 등을 전체 조회합니다. 특정 게시물의 내용을 자세히 읽고 요약하거나 답변해야 할 때 호출하세요.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            board_no: {
              type: SchemaType.STRING,
              description: '조회할 게시물 고유 번호 (board_no)',
            },
          },
          required: ['board_no'],
        },
      },
    ],
  },
];

export async function handleToolCall(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    if (name === 'search_board_posts') {
      const keyword = String(args.keyword ?? '');
      const boardCode = args.board_code ? String(args.board_code) : null;
      const limit = Math.min(Number(args.limit ?? 5), 20);
      const like = `%${keyword}%`;

      let rows;
      if (boardCode) {
        [rows] = await pool.query(
          `SELECT board_no, board_code, title, LEFT(content, 200) AS preview, user_id,
                  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
           FROM T_BOARD WHERE del_yn='N' AND board_code=? AND (title LIKE ? OR content LIKE ?)
           ORDER BY created_at DESC LIMIT ?`,
          [boardCode, like, like, limit]
        );
      } else {
        [rows] = await pool.query(
          `SELECT board_no, board_code, title, LEFT(content, 200) AS preview, user_id,
                  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
           FROM T_BOARD WHERE del_yn='N' AND (title LIKE ? OR content LIKE ?)
           ORDER BY created_at DESC LIMIT ?`,
          [like, like, limit]
        );
      }

      const results = rows as Record<string, unknown>[];
      if (results.length === 0) return `"${keyword}" 에 해당하는 게시물이 없습니다.`;
      return JSON.stringify(results);
    }

    if (name === 'get_recent_posts') {
      const boardCode = args.board_code ? String(args.board_code) : null;
      const limit = Math.min(Number(args.limit ?? 5), 20);

      let rows;
      if (boardCode) {
        [rows] = await pool.query(
          `SELECT board_no, board_code, title, user_id,
                  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at,
                  (SELECT COUNT(*) FROM T_COMMENT c WHERE c.board_no=b.board_no AND c.del_yn='N') AS comment_count
           FROM T_BOARD b WHERE del_yn='N' AND board_code=? ORDER BY created_at DESC LIMIT ?`,
          [boardCode, limit]
        );
      } else {
        [rows] = await pool.query(
          `SELECT board_no, board_code, title, user_id,
                  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at,
                  (SELECT COUNT(*) FROM T_COMMENT c WHERE c.board_no=b.board_no AND c.del_yn='N') AS comment_count
           FROM T_BOARD b WHERE del_yn='N' ORDER BY created_at DESC LIMIT ?`,
          [limit]
        );
      }

      const results = rows as Record<string, unknown>[];
      if (results.length === 0) return '게시물이 없습니다.';
      return JSON.stringify(results);
    }

    if (name === 'list_boards') {
      const [rows] = await pool.query(
        `SELECT board_code, COUNT(*) AS post_count,
                MAX(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i')) AS latest_post_at
         FROM T_BOARD WHERE del_yn='N' GROUP BY board_code ORDER BY post_count DESC`
      );
      const results = rows as Record<string, unknown>[];
      if (results.length === 0) return '등록된 게시판이 없습니다.';
      return JSON.stringify(results);
    }

    if (name === 'get_post_content') {
      const boardNo = String(args.board_no ?? '');
      if (!boardNo) return '게시물 번호(board_no)가 필수입니다.';

      const [rows] = await pool.query(
        `SELECT board_no, board_code, title, content, user_id,
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
         FROM T_BOARD WHERE board_no=? AND del_yn='N'`,
        [boardNo]
      );
      
      const results = rows as Record<string, unknown>[];
      if (results.length === 0) return '존재하지 않거나 삭제된 게시물입니다.';
      return JSON.stringify(results[0]);
    }

    return '알 수 없는 도구입니다.';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `DB 조회 오류: ${msg}`;
  }
}
