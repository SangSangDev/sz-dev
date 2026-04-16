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
            board_name: {
              type: SchemaType.STRING,
              description: '(선택) 특정 게시판 명. 생략하면 전체 게시판 검색.',
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
            board_name: {
              type: SchemaType.STRING,
              description: '(선택) 게시판 명. 생략하면 전체 게시판 최신 글.',
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
        description: '특정 게시물의 제목, 본문 내용, 작성자, 작성일 등을 전체 조회합니다. 특정 게시물의 내용을 자세히 읽고 요약하거나 답변해야 할 때 호출하세요. board_no 또는 매칭되는 title 중 하나를 제공해야 합니다.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            board_no: {
              type: SchemaType.STRING,
              description: '조회할 게시물 고유 번호 (board_no)',
            },
            title: {
              type: SchemaType.STRING,
              description: '조회할 게시물의 정확한 제목 (board_no를 모를 때 사용)',
            },
          },
          required: [],
        },
      },
    ],
  },
];

export async function handleToolCall(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    if (name === 'search_board_posts') {
      const keyword = String(args.keyword ?? '');
      const boardName = args.board_name ? String(args.board_name) : null;
      const limit = Math.min(Number(args.limit ?? 5), 20);
      const like = `%${keyword}%`;

      let rows;
      if (boardName) {
        [rows] = await pool.query(
          `SELECT b.board_no, m.menu_name AS board_name, b.title, LEFT(b.content, 200) AS preview, b.user_id,
                  DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i') AS created_at
           FROM T_BOARD b
           JOIN T_MENU m ON b.board_code = m.board_code
           WHERE b.del_yn='N' AND m.menu_name=? AND m.use_yn='Y' AND m.del_yn='N' AND (b.title LIKE ? OR b.content LIKE ?)
           ORDER BY b.created_at DESC LIMIT ?`,
          [boardName, like, like, limit]
        );
      } else {
        [rows] = await pool.query(
          `SELECT b.board_no, m.menu_name AS board_name, b.title, LEFT(b.content, 200) AS preview, b.user_id,
                  DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i') AS created_at
           FROM T_BOARD b
           LEFT JOIN T_MENU m ON b.board_code = m.board_code
           WHERE b.del_yn='N' AND (b.title LIKE ? OR b.content LIKE ?)
           ORDER BY b.created_at DESC LIMIT ?`,
          [like, like, limit]
        );
      }

      const results = rows as Record<string, unknown>[];
      if (results.length === 0) return `"${keyword}" 에 해당하는 게시물이 없습니다.`;
      return JSON.stringify(results);
    }

    if (name === 'get_recent_posts') {
      const boardName = args.board_name ? String(args.board_name) : null;
      const limit = Math.min(Number(args.limit ?? 5), 20);

      let rows;
      if (boardName) {
        [rows] = await pool.query(
          `SELECT b.board_no, m.menu_name AS board_name, b.title, b.user_id,
                  DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i') AS created_at,
                  (SELECT COUNT(*) FROM T_COMMENT c WHERE c.board_no=b.board_no AND c.del_yn='N') AS comment_count
           FROM T_BOARD b
           JOIN T_MENU m ON b.board_code = m.board_code
           WHERE b.del_yn='N' AND m.menu_name=? AND m.use_yn='Y' AND m.del_yn='N'
           ORDER BY b.created_at DESC LIMIT ?`,
          [boardName, limit]
        );
      } else {
        [rows] = await pool.query(
          `SELECT b.board_no, m.menu_name AS board_name, b.title, b.user_id,
                  DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i') AS created_at,
                  (SELECT COUNT(*) FROM T_COMMENT c WHERE c.board_no=b.board_no AND c.del_yn='N') AS comment_count
           FROM T_BOARD b
           LEFT JOIN T_MENU m ON b.board_code = m.board_code
           WHERE b.del_yn='N' ORDER BY b.created_at DESC LIMIT ?`,
          [limit]
        );
      }

      const results = rows as Record<string, unknown>[];
      if (results.length === 0) return '게시물이 없습니다.';
      return JSON.stringify(results);
    }

    if (name === 'list_boards') {
      const [rows] = await pool.query(
        `SELECT m.menu_name AS board_name, m.is_public, COUNT(b.board_no) AS post_count,
                MAX(DATE_FORMAT(b.created_at, '%Y-%m-%d %H:%i')) AS latest_post_at
         FROM T_MENU m
         LEFT JOIN T_BOARD b ON m.board_code = b.board_code AND b.del_yn = 'N'
         WHERE m.is_board='Y' AND m.use_yn='Y' AND m.del_yn='N'
         GROUP BY m.menu_name, m.is_public ORDER BY post_count DESC`
      );
      const results = rows as Record<string, unknown>[];
      if (results.length === 0) return '등록된 게시판이 없습니다.';
      return JSON.stringify(results);
    }

    if (name === 'get_post_content') {
      const boardNo = args.board_no ? String(args.board_no) : null;
      const title = args.title ? String(args.title) : null;
      if (!boardNo && !title) return '게시물 번호(board_no) 또는 제목(title) 중 하나가 필수입니다.';

      let rows;
      if (boardNo) {
        [rows] = await pool.query(
          `SELECT board_no, board_code, title, content, user_id,
          DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
           FROM T_BOARD WHERE board_no =? AND del_yn = 'N'`,
          [boardNo]
        );
      } else {
        [rows] = await pool.query(
          `SELECT board_no, board_code, title, content, user_id,
          DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
           FROM T_BOARD WHERE title LIKE ? AND del_yn = 'N' ORDER BY created_at DESC LIMIT 1`,
          [`%${title}%`]
        );
      }

      const results = rows as Record<string, unknown>[];
      if (results.length === 0) return '존재하지 않거나 삭제된 게시물입니다.';
      return JSON.stringify(results[0]);
    }

    return '알 수 없는 도구입니다.';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `DB 조회 오류: ${msg} `;
  }
}
