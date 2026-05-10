"use client";

import type { AnchorHTMLAttributes } from "react";
import { useCallback, useId, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ANDROID_PLAY_STORE_URL } from "@/lib/app-store-links";

const STORE_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer",
} satisfies Pick<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel">;

type Density = "compact" | "comfortable";

const comfortableClass =
  "inline-flex cursor-pointer items-center rounded-[14px] border border-transparent bg-[#6d28d9] px-7 py-[14px] text-[15px] font-bold text-white no-underline shadow-[0_6px_20px_rgba(109,40,217,0.3)] outline-none ring-offset-2 transition-[background-color,color,transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:border-[rgba(167,139,250,0.35)] hover:bg-[#5b21b6] hover:shadow-[0_12px_32px_rgba(109,40,217,0.36)] [&>span]:inline-block [&>span]:transition-transform [&>span]:duration-300 [&>span]:ease-out hover:[&>span]:translate-x-0.5 focus-visible:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#6d28d9] active:translate-y-0 active:scale-[0.98]";

const compactClass =
  "inline-flex shrink-0 cursor-pointer items-center whitespace-nowrap rounded-[10px] border border-transparent bg-[#6d28d9] px-3 py-2 text-[12px] font-bold leading-tight text-white no-underline shadow-[0_4px_14px_rgba(109,40,217,0.25)] outline-none ring-offset-2 transition-[background-color,color,transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#5b21b6] hover:shadow-[0_8px_22px_rgba(109,40,217,0.32)] focus-visible:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#6d28d9] active:translate-y-0 active:scale-[0.98] sm:px-[18px] sm:text-[13px]";

/** Confirmation step using `<dialog>` + `showModal()` — viewport-centered top layer. */
export function GetTheAppButton(props: {
  density: Density;
  className?: string;
  showArrow?: boolean;
}) {
  const dialogTitleId = useId();
  const dialogDescId = useId();
  const uid = useId();
  const dialogHtmlId = `android-download-dialog-${uid.replace(/:/g, "")}`;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLAnchorElement>(null);
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const returnFocusToTrigger = useCallback(() => {
    requestAnimationFrame(() => openBtnRef.current?.focus({ preventScroll: true }));
  }, []);

  const openDialog = useCallback(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (!d.open) d.showModal();
    setOpen(true);
    queueMicrotask(() => continueRef.current?.focus({ preventScroll: true }));
  }, []);

  const onDialogClose = useCallback(() => {
    setOpen(false);
    returnFocusToTrigger();
  }, [returnFocusToTrigger]);

  const onBackdropMouseDown = useCallback((e: ReactMouseEvent<HTMLDialogElement>) => {
    const t = e.target;
    if (!(t instanceof Node)) return;
    if (panelRef.current?.contains(t)) return;
    e.preventDefault();
    dialogRef.current?.close();
  }, []);

  const triggerClass =
    props.density === "compact"
      ? compactClass + (props.className ? ` ${props.className}` : "")
      : comfortableClass + (props.className ? ` ${props.className}` : "");

  return (
    <>
      <button
        ref={openBtnRef}
        type="button"
        className={triggerClass}
        style={{ textDecorationLine: "none" }}
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogHtmlId}
      >
        Get the app {props.showArrow ? <span aria-hidden>→</span> : null}
      </button>

      <dialog
        ref={dialogRef}
        id={dialogHtmlId}
        className="landing-android-download-modal landing-page-motion outline-none focus:outline-none"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescId}
        onClose={onDialogClose}
        onMouseDown={onBackdropMouseDown}
      >
        <div
          ref={panelRef}
          className="rounded-[20px] border border-[#e9e6ff] bg-white p-5 shadow-[0_24px_64px_-12px_rgba(109,40,217,0.28)] sm:p-6"
        >
          <div className="mb-6">
            <h2
              id={dialogTitleId}
              className="text-lg font-black tracking-tight text-[#1a1a2e]"
              style={{ fontFamily: "'DM Sans', 'Nunito', 'Segoe UI', sans-serif" }}
            >
              Want to download for Android?
            </h2>
            <p id={dialogDescId} className="mt-2 text-[14px] leading-relaxed text-slate-500">
              You&apos;re about to download the KumoPay APK from the Solana dApp Store. This link opens in a new tab.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <form method="dialog">
              <button
                type="submit"
                className="w-full rounded-[14px] border-2 border-[#e9e6ff] bg-white px-4 py-[13px] text-[15px] font-bold text-[#475569] outline-none ring-offset-2 transition-colors hover:border-[#c7b8ff] hover:bg-violet-50/60 focus-visible:ring-2 focus-visible:ring-[#6d28d9] sm:w-auto sm:min-w-[100px]"
              >
                Cancel
              </button>
            </form>
            <a
              ref={continueRef}
              href={ANDROID_PLAY_STORE_URL}
              {...STORE_LINK_PROPS}
              onClick={() => dialogRef.current?.close()}
              className="inline-flex w-full items-center justify-center rounded-[14px] bg-[#6d28d9] px-4 py-[14px] text-[15px] font-bold text-white no-underline shadow-[0_6px_20px_rgba(109,40,217,0.28)] outline-none ring-offset-2 transition-[background-color,transform] duration-200 ease-out hover:bg-[#5b21b6] hover:shadow-[0_12px_28px_rgba(109,40,217,0.34)] focus-visible:ring-2 focus-visible:ring-[#6d28d9] active:scale-[0.99] sm:w-auto"
            >
              Continue to dApp Store
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
