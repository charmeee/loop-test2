#!/bin/zsh
# 이 파일이 있는 프로젝트 폴더로 이동합니다.
cd -- "${0:A:h}" || exit 1
# 공식 Loop Engineering 설정을 생성합니다. 이슈 작업이나 머지는 실행하지 않습니다.
npm run loop:setup
result=$?
# Finder에서 실행한 경우 결과를 읽고 창을 닫을 수 있게 기다립니다.
printf '\n종료 코드: %s\nEnter를 누르면 종료합니다.\n' "$result"
read
exit "$result"
