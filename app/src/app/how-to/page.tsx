import { Card, PageTitle } from "@/components/ui";

const STEPS = [
  {
    t: "팀 확인하고 로그인",
    d: "운영진이 2~4명으로 팀을 편성해요. 디스코드로 로그인하면 우리 팀과 팀원이 보여요.",
  },
  {
    t: "팀 빙고판 꾸미기",
    d: "시즌 시작 전에 팀원이 함께 팀명과 빙고판 색(하늘·모카 중 하나)을 정하고, 제시된 미션 중 25개를 골라 칸에 놓아요. 대면 칸 5개에는 대면 미션만, 나머지 20칸에는 비대면 미션만 놓을 수 있어요. 시작하면 판이 잠겨요.",
  },
  {
    t: "비대면 미션은 매일 오전 7시 공지",
    d: "시작일부터 마지막 날까지 매일 1개씩 공지돼요. 공지된 당일 23:59까지 사진과 함께 인증해야 해요. 지난 미션은 소급 인증할 수 없어요.",
  },
  {
    t: "대면 미션은 시작일에 한꺼번에 공지",
    d: "최종 마감일 전까지 언제든 팀원이 함께 수행하고 인증하면 칸이 채워져요.",
  },
  {
    t: "인증은 디스코드에서 /인증",
    d: "인증 채널에서 /인증 명령을 입력하고, 미션 번호와 사진을 붙여요. 봇이 바로 칸을 채우고 채널에 인증 기록을 남겨요. 사진이 필요 없는 미션은 사진 없이도 인증할 수 있어요.",
  },
  {
    t: "팀원 모두 참여가 기본",
    d: "모든 미션은 팀원 모두가 참여한 것을 기준으로 인정돼요. 운영진이 사진을 확인하고, 문제가 있으면 반려할 수 있어요.",
  },
];

const FAQ = [
  {
    q: "인증했는데 칸이 안 채워져요",
    a: "명령을 입력한 본인에게만 보이는 안내 메시지에 이유가 적혀 있어요. 예를 들어 우리 팀 빙고판에 없는 미션이거나, 인증 기간이 지났거나, 사진이 빠졌을 수 있어요.",
  },
  {
    q: "인증이 반려됐어요",
    a: "미션과 관련 없거나 팀원이 모두 참여하지 않은 사진이면 운영진이 반려할 수 있어요. 반려되면 해당 칸이 다시 비워지고, 인증 메시지를 지워도 반려 처리돼요.",
  },
  {
    q: "같은 미션을 두 번 인증하면요?",
    a: "칸은 한 번만 채워져요. 두 번째 인증은 기록만 남아요.",
  },
];

export default function HowToPage() {
  return (
    <>
      <PageTitle title="이용 방법" desc="짝꽁빙고는 이렇게 진행돼요" />

      <section className="mb-8 rounded-[2rem] bg-sky p-6 sm:p-8">
        <span className="inline-flex rounded-full bg-white px-3 py-1 text-[13px] font-bold">인증하는 방법</span>
        <p className="mt-4 rounded-[1.1rem] bg-white px-4 py-3.5 font-mono text-sm font-semibold sm:text-base">
          /인증 <span className="text-muted">번호:</span>12 <span className="text-muted">사진:</span>[사진 첨부]
        </p>
        <p className="mt-3 text-sm">디스코드 인증 채널에서 / 를 누르고 &quot;인증&quot;을 고른 뒤, 번호와 사진을 채우면 돼요. 번호는 빙고판 칸에 크게 적힌 숫자예요. 빙고판에서 칸을 누르면 명령어를 바로 복사할 수 있어요.</p>
      </section>

      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.t} className="card flex gap-4 p-5">
            <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${i % 2 === 0 ? "bg-sky-soft" : "bg-cocoa-soft"}`}>{i + 1}</span>
            <div>
              <h2 className="text-[17px] font-black tracking-[-0.02em]">{s.t}</h2>
              <p className="mt-1 text-sm text-sub">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mb-3 mt-10 px-1 text-xl font-black tracking-[-0.03em]">시상은 이렇게 정해요</h2>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <Card>
          <p className="font-black">1등 · 2등 팀</p>
          <p className="mt-1 text-sub">① 빙고 줄을 많이 채운 순서 → ② 빙고를 만들지 못했더라도 채운 칸이 많은 순서 → ③ 대면 미션을 많이 수행한 순서로 정해요.</p>
        </Card>
        <Card>
          <p className="font-black">추첨 1팀</p>
          <p className="mt-1 text-sub">1·2등을 제외한 팀 중 1팀을 뽑아 소정의 추가 상품을 드려요. 각 팀이 채운 칸의 개수만큼 쪽지를 받아서, 많이 수행할수록 당첨 확률이 올라가요. 추첨 과정은 임원진이 모여 촬영해요.</p>
        </Card>
      </div>

      <h2 className="mb-3 mt-10 px-1 text-xl font-black tracking-[-0.03em]">자주 묻는 질문</h2>
      <div className="space-y-2 text-sm">
        {FAQ.map((f) => (
          <details key={f.q} className="card group p-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black">
              {f.q}
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-well text-base transition-transform group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <p className="mt-2 text-sub">{f.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
