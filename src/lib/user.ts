/**
 * 用户称呼(localStorage):首页节律问候用。
 * 仅在浏览器本地保存,不上传服务器。
 */
const NAME_KEY = "nf2-username";

export function loadUserName(): string {
  try {
    return (localStorage.getItem(NAME_KEY) ?? "").trim();
  } catch {
    return "";
  }
}

export function saveUserName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.trim().slice(0, 12));
  } catch {
    /* ignore */
  }
}
