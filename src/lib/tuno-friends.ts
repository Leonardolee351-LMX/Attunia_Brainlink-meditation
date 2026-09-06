import { EXPERT_ICON } from "@/lib/expert-icons";

/** 会诊页展示用 Friends 名册（与后端专家目录对齐，前端只渲染、不改派工语义） */
export type TunoFriend = {
  id: string;
  name: string;
  role: string;
  blurb: string;
  icon: string;
  avatar: string;
  /** 卡片底色 */
  bg: string;
  /** 角色小标色 */
  accent: string;
  host?: boolean;
};

export const TUNO_HOST: TunoFriend = {
  id: "tuno",
  name: "Tuno",
  role: "编排中枢",
  blurb: "听你怎么说，再决定顺序与谁上场",
  icon: "✦",
  avatar: "/brand/friends/tuno.png?v=flat",
  bg: "#E8ECEF",
  accent: "#111111",
  host: true,
};

export const TUNO_FRIENDS: TunoFriend[] = [
  {
    id: "expert_counsel",
    name: "Mira",
    role: "心理咨询",
    blurb: "减压、允许停下、先被接住",
    icon: EXPERT_ICON.expert_counsel,
    avatar: "/brand/friends/mira.png?v=flat",
    bg: "#D8EFE3",
    accent: "#2F6B52",
  },
  {
    id: "expert_cogsci",
    name: "Dr. Chen",
    role: "认知科学",
    blurb: "专注与认知卸负荷",
    icon: EXPERT_ICON.expert_cogsci,
    avatar: "/brand/friends/chen.png?v=flat",
    bg: "#F3E7C4",
    accent: "#8A6A1E",
  },
  {
    id: "expert_flow",
    name: "Kai",
    role: "心流体验",
    blurb: "沉浸入口与完成感",
    icon: EXPERT_ICON.expert_flow,
    avatar: "/brand/friends/kai.png?v=flat",
    bg: "#F6D9CE",
    accent: "#A14B32",
  },
  {
    id: "expert_neuro",
    name: "Dr. Vega",
    role: "脑科学",
    blurb: "生理下行与睡前节奏",
    icon: EXPERT_ICON.expert_neuro,
    avatar: "/brand/friends/vega.png?v=flat",
    bg: "#D5DCF5",
    accent: "#3D4F8F",
  },
  {
    id: "expert_art",
    name: "Sona",
    role: "艺术与创作",
    blurb: "点选目录里的声音与意象",
    icon: EXPERT_ICON.expert_art,
    avatar: "/brand/friends/sona.png?v=flat",
    bg: "#E8DCF2",
    accent: "#6B4A86",
  },
];

export const TUNO_ROSTER: TunoFriend[] = [TUNO_HOST, ...TUNO_FRIENDS];
