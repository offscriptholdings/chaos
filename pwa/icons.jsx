// Lucide-style icons inlined as React components. Stroke-based, 24x24 default.
const IconBase = ({ size = 24, stroke = 'currentColor', strokeWidth = 2, children, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

const IconActivity = (p) => (<IconBase {...p}><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.5.5 0 0 1-.96 0L9.24 2.18a.5.5 0 0 0-.96 0l-2.35 8.36A2 2 0 0 1 4 12H2" /></IconBase>);
const IconList = (p) => (<IconBase {...p}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></IconBase>);
const IconFileSearch = (p) => (<IconBase {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9.5L14 2z" /><polyline points="14 2 14 8 20 8" /><circle cx="11.5" cy="14.5" r="2.5" /><line x1="13.25" y1="16.25" x2="15" y2="18" /></IconBase>);
const IconEye = (p) => (<IconBase {...p}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></IconBase>);
const IconBookOpen = (p) => (<IconBase {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></IconBase>);
const IconTrendingUp = (p) => (<IconBase {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></IconBase>);
const IconBarChart3 = (p) => (<IconBase {...p}><path d="M3 3v18h18" /><path d="M7 16V9" /><path d="M12 16V5" /><path d="M17 16v-4" /></IconBase>);
const IconSlidersHorizontal = (p) => (<IconBase {...p}><line x1="21" y1="4" x2="14" y2="4" /><line x1="10" y1="4" x2="3" y2="4" /><line x1="21" y1="12" x2="12" y2="12" /><line x1="8" y1="12" x2="3" y2="12" /><line x1="21" y1="20" x2="16" y2="20" /><line x1="12" y1="20" x2="3" y2="20" /><line x1="14" y1="2" x2="14" y2="6" /><line x1="8" y1="10" x2="8" y2="14" /><line x1="16" y1="18" x2="16" y2="22" /></IconBase>);
const IconChevronRight = (p) => (<IconBase {...p}><polyline points="9 18 15 12 9 6" /></IconBase>);
const IconChevronLeft = (p) => (<IconBase {...p}><polyline points="15 18 9 12 15 6" /></IconBase>);
const IconArrowLeft = (p) => (<IconBase {...p}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></IconBase>);
const IconBell = (p) => (<IconBase {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></IconBase>);
const IconRefresh = (p) => (<IconBase {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></IconBase>);
const IconPlay = (p) => (<IconBase {...p}><polygon points="6 3 20 12 6 21 6 3" /></IconBase>);
const IconCheck = (p) => (<IconBase {...p}><polyline points="20 6 9 17 4 12" /></IconBase>);
const IconX = (p) => (<IconBase {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></IconBase>);
const IconSparkle = (p) => (<IconBase {...p}><path d="M12 3 13.7 9.3 20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7Z" /></IconBase>);

Object.assign(window, {
  IconActivity, IconList, IconFileSearch, IconEye, IconBookOpen,
  IconTrendingUp, IconBarChart3, IconSlidersHorizontal,
  IconChevronRight, IconChevronLeft, IconArrowLeft, IconBell,
  IconRefresh, IconPlay, IconCheck, IconX, IconSparkle,
});
