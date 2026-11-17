/* eslint-disable @next/next/no-img-element */
import { Card, Field, PageTitle, btn, inputCls } from "@/components/ui";
import { Flash } from "@/components/flash";
import { ConfirmButton } from "@/components/confirm-button";
import { db } from "@/lib/db";
import { BUILTIN_STICKERS } from "@/lib/decor";
import { deleteSticker, uploadSticker } from "../actions";

export default async function StickersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const rows = await db.sticker.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <PageTitle title="꾸미기 스티커" desc="팀이 빙고판에 붙일 수 있는 스티커예요. 기본 스티커는 직접 그린 그림이라 바로 쓸 수 있어요." />
      <Flash ok={sp.ok} error={sp.error} />

      <Card className="mb-6">
        <h2 className="font-black">스티커 올리기</h2>
        <p className="mt-1 text-sm text-sub">
          학생회가 직접 만들었거나 사용 허락·라이선스를 받은 이미지만 올려 주세요. 캐릭터 이미지를 인터넷에서 그대로 가져오면 저작권 문제가 생길 수 있어요. 배경이 투명한 PNG를 추천해요 (300KB 이하).
        </p>
        <form action={uploadSticker} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="이름">
            <input name="name" maxLength={20} placeholder="예: 학생회 마스코트" className={inputCls} />
          </Field>
          <Field label="이미지">
            <input name="file" type="file" required accept="image/png,image/webp,image/gif,image/jpeg,image/svg+xml" className={`${inputCls} !py-2.5`} />
          </Field>
          <button className={btn.primary}>올리기</button>
        </form>
      </Card>

      <Card className="mb-6">
        <h2 className="font-black">올린 스티커 {rows.length}개</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted">아직 올린 스티커가 없어요.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-col items-center gap-1.5 rounded-2xl bg-well p-3">
                <img src={s.data} alt={s.name} className="size-16 object-contain" />
                <span className="w-full truncate text-center text-xs font-bold">{s.name}</span>
                <form action={deleteSticker}>
                  <input type="hidden" name="id" value={s.id} />
                  <ConfirmButton message={`"${s.name}" 스티커를 지울까요? 이미 붙인 판에서도 사라져요.`} className={btn.small}>
                    지우기
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-black">기본 스티커 {BUILTIN_STICKERS.length}개</h2>
        <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
          {BUILTIN_STICKERS.map((s) => (
            <li key={s.id} className="flex flex-col items-center gap-1 rounded-2xl bg-well p-2">
              <img src={s.src} alt={s.name} className="size-12" />
              <span className="text-xs text-sub">{s.name}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
