type Environment = 'local' | 'dev' | 'prd';

interface DbConfig {
  host: string;
  user: string;
  password?: string;
  database: string;
  port: number;
}

interface RedisConfig {
  url: string;
}

interface AppConfig {
  env: Environment;
  db: DbConfig;
  redis: RedisConfig;
  encryptionKey: string;
}

// 1. Local (로컬 개발 서버 - Docker Desktop 기반)
const localConfig: AppConfig = {
  env: 'local',
  db: {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || 'szdev',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-local-encryption-key-32b',
};

// 2. Dev (개발/스테이징 서버 - 추후 배포용 IP나 외부 DB 주소 입력)
const devConfig: AppConfig = {
  env: 'dev',
  db: {
    host: process.env.MYSQL_HOST || 'dev-db.internal',
    user: process.env.MYSQL_USER || 'dev-user',
    password: process.env.MYSQL_PASSWORD || 'dev-pass',
    database: process.env.MYSQL_DATABASE || 'szdev',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://dev-redis.internal:6379',
  },
  encryptionKey: process.env.ENCRYPTION_KEY || 'dev-environment-encryption-key-32',
};

// 3. Prd (운영 서버 - 오직 환경변수로만 안전하게 바인딩)
const prdConfig: AppConfig = {
  env: 'prd',
  db: {
    host: process.env.MYSQL_HOST || 'prod-db.internal',
    user: process.env.MYSQL_USER || '',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'szdev',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://prod-redis.internal:6379',
  },
  encryptionKey: process.env.ENCRYPTION_KEY || 'prod-environment-encryption-key-!!',
};

// 프로필 결정 로직
const determineConfig = (): AppConfig => {
  // 사용자가 APP_PROFILE 환경변수로 명시했다면 그것을 최우선으로 따름
  const profile = (process.env.APP_PROFILE || process.env.NODE_ENV || 'local').toLowerCase();

  switch (profile) {
    case 'prd':
    case 'production':
      return prdConfig;
    case 'dev':
    case 'development':
      // 기본적으로 next.js는 dev 모드일때 NODE_ENV를 development로 세팅함
      // 만약 의도적으로 dev 클라우드를 바라보게 하려면 APP_PROFILE=dev 로 실행
      if (process.env.APP_PROFILE === 'dev') {
        return devConfig;
      }
      return localConfig; // 아무 지정 없는 로컬 npm run dev 상태
    case 'local':
    default:
      return localConfig;
  }
};

export const config = determineConfig();
