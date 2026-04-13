#!/bin/bash
# 에러 발생 시 스크립트 실행 즉각 중단
set -e 

PROJECT_NAME="sz-dev-app"
PROJECT_DIR="/home/dltkddbs/sz-dev"
GIT_REPO="https://github.com/SangSangDev/sz-dev.git"
BRANCH="master"

echo "🚀 배포를 시작합니다..."

# 1. 프로젝트 폴더가 없으면 git clone, 있으면 최신 코드로 동기화
if [ ! -d "$PROJECT_DIR" ]; then
  echo "📥 프로젝트 폴더가 없습니다. 레포지토리를 복제합니다..."
  # 상위 디렉터리가 없을 수 있으므로 미리 생성 시도
  mkdir -p "/home/dltkddbs"
  git clone -b $BRANCH $GIT_REPO $PROJECT_DIR
  cd $PROJECT_DIR
else
  echo "🔄 기존 폴더 감지됨. 최신 코드로 덮어씁니다..."
  cd $PROJECT_DIR
  git fetch origin
  git reset --hard origin/$BRANCH
fi

# 2. 도커 컴포즈 구동 (DB & Redis)
echo "🐳 데이터베이스(Docker) 구동 상태 점검 및 실행..."
# 기존 docker-compose.yml을 바탕으로 백그라운드 구동 (이미 떠있으면 무시됨)
docker compose up -d

# 2.5 DB 마이그레이션 실행
echo "🗄️ 데이터베이스 마이그레이션(업데이트) 진행 중..."
# 만약 .env 파일이 있다면 먼저 불러옵니다. (비밀번호 동적 주입을 위함)
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# MySQL 초기화(볼륨 삭제 후 첫 구동) 시에는 최대 30~60초가 소요됩니다. 넉넉히 15초 대기
sleep 15
ROOT_PASS=${MYSQL_ROOT_PASSWORD:-root}
docker compose exec -T mysql mysql -u root -p"${ROOT_PASS}" szdev < migration_02_menu_update.sql || echo "⚠️ 마이그레이션 중 경고 발생(초기화 중이거나 이미 반영됨)"

# 3. 환경 변수(.env) 보안 세팅 경고
if [ ! -f .env ]; then
  echo "⚠️ [주의] .env 파일이 존재하지 않습니다. 서버에 직접 구성해 주셔야 합니다!"
fi

# 4. 의존성 설치
echo "📦 패키지(npm install) 설치 중..."
npm install

# 5. Next.js 프로젝트 빌드
echo "🔨 Next.js 프로덕션 모드 빌드 중..."
npm run build

# 6. PM2를 통한 서버 무중단 실행
echo "🌍 PM2 무중단 서비스 시작..."
# 전역 설치된 PM2가 존재하는지 확인
if ! command -v pm2 &> /dev/null; then
    echo "⚙️ PM2가 설치되어 있지 않습니다. 전역으로 설치를 시도합니다..."
    sudo npm install -g pm2
fi

# PM2 리스트에 이미 켜져있는 프로세스인지 확인 등록
if pm2 status | grep -q $PROJECT_NAME; then
  echo "🔄 무중단 서비스 리로드(Reload) 진행 중..."
  pm2 reload $PROJECT_NAME
else
  echo "▶️ 신규 서비스 PM2 등록 및 시작 중..."
  pm2 start npm --name $PROJECT_NAME -- start
fi

# 부팅 시 PM2가 자동으로 띄워지도록 설정 저장
pm2 save

echo "🎉🎉 배포가 성공적으로 완료되었습니다! 🎉🎉"
