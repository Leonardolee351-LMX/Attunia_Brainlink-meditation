/**
 * 手机框顶栏：Dynamic Island 占位与全幅出血。
 * 数值须与 AppFrame 里 Island / scroll padding 同步。
 */
export const PHONE_TOP_INSET_MOBILE = "max(12px,env(safe-area-inset-top,0px))";
/** sm 机框：Island 上方 + 本体高度后的内容起始 */
export const PHONE_TOP_INSET_DESKTOP_PX = 44;

/** 顶满 Island：负 margin 吃掉 AppFrame 顶垫，背景铺到机框顶 */
export const PHONE_BLEED =
  "relative -mt-[max(12px,env(safe-area-inset-top,0px))] flex h-[calc(100%+max(12px,env(safe-area-inset-top,0px)))] w-full flex-col overflow-hidden sm:-mt-[44px] sm:h-[calc(100%+44px)]";

/** 出血页内文案避开 Island */
export const PHONE_SAFE_TOP =
  "pt-[max(20px,env(safe-area-inset-top,0px))] sm:pt-[52px]";

/** @deprecated 用 PHONE_BLEED */
export const ONBOARD_BLEED = PHONE_BLEED;
/** @deprecated 用 PHONE_SAFE_TOP */
export const ONBOARD_SAFE_TOP = PHONE_SAFE_TOP;
