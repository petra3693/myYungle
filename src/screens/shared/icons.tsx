// ─── Icons (thin stroke, rounded) ──────────────────────────────────────────────

function Icon({ children, size = 20 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  )
}

function NavIcon({ children, size = 20, viewBox }: { children: React.ReactNode; size?: number; viewBox: string }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  )
}
const IconNavHome = (p: { size?: number }) => (
  <NavIcon {...p} viewBox="26 17 20 21">
    <path d="M38.75 36.2497V28.9163C38.75 28.6732 38.6534 28.4401 38.4815 28.2682C38.3096 28.0963 38.0764 27.9997 37.8333 27.9997H34.1667C33.9236 27.9997 33.6904 28.0963 33.5185 28.2682C33.3466 28.4401 33.25 28.6732 33.25 28.9163V36.2497M27.75 26.1668C27.7499 25.9001 27.8081 25.6366 27.9203 25.3947C28.0326 25.1528 28.1962 24.9383 28.3999 24.7661L34.8166 19.2661C35.1475 18.9864 35.5667 18.833 36 18.833C36.4333 18.833 36.8525 18.9864 37.1834 19.2661L43.6001 24.7661C43.8038 24.9383 43.9674 25.1528 44.0797 25.3947C44.1919 25.6366 44.2501 25.9001 44.25 26.1668V34.4168C44.25 34.903 44.0568 35.3693 43.713 35.7131C43.3692 36.057 42.9029 36.2501 42.4167 36.2501H29.5833C29.0971 36.2501 28.6308 36.057 28.287 35.7131C27.9432 35.3693 27.75 34.903 27.75 34.4168V26.1668Z" />
  </NavIcon>
)
const IconNavCalendar = (p: { size?: number }) => (
  <NavIcon {...p} viewBox="102 17 20 22">
    <path d="M108.333 18.833V22.5M115.667 18.833V22.5M103.75 26.1669H120.25M105.583 20.6665H118.417C119.429 20.6665 120.25 21.4874 120.25 22.5V35.3343C120.25 36.3469 119.429 37.1678 118.417 37.1678H105.583C104.571 37.1678 103.75 36.3469 103.75 35.3343V22.5C103.75 21.4874 104.571 20.6665 105.583 20.6665Z" />
  </NavIcon>
)
const IconNavAdd = (p: { size?: number }) => (
  <NavIcon {...p} viewBox="165 17 22 22">
    <path d="M172.333 28.0004H179.667M176 24.3334V31.6674M185.168 28.0004C185.168 33.0634 181.063 37.1678 176 37.1678C170.937 37.1678 166.833 33.0634 166.833 28.0004C166.833 22.9374 170.937 18.833 176 18.833C181.063 18.833 185.168 22.9374 185.168 28.0004Z" />
  </NavIcon>
)
const IconNavHealth = (p: { size?: number }) => (
  <NavIcon {...p} viewBox="0 0 20 19">
    <path
      d="M17.003 11.0015V14.0015H20.003V16.0015H17.003V19.0015H15.003V16.0015H12.003V14.0015H15.003V11.0015H17.003ZM18.246 1.75853C19.3292 2.84154 19.9571 4.29782 20.0012 5.82892C20.0453 7.36003 19.5021 8.85001 18.483 9.99353L17.063 8.57553C18.393 7.05153 18.323 4.66153 16.83 3.17153C16.1073 2.4501 15.1361 2.03235 14.1154 2.00391C13.0947 1.97546 12.1017 2.33846 11.34 3.01853L10.005 4.21653L8.66898 3.01953C7.91065 2.34142 6.92244 1.97772 5.90544 2.00245C4.88844 2.02717 3.91908 2.43846 3.1946 3.15262C2.47012 3.86678 2.04496 4.83015 2.00565 5.84668C1.96634 6.86322 2.31582 7.85655 2.98298 8.62453L11.415 17.0705L10.003 18.4865L1.52298 9.99453C0.502231 8.85049 -0.0418219 7.35909 0.00251128 5.82651C0.0468444 4.29394 0.6762 2.83648 1.76137 1.75336C2.84654 0.670234 4.30518 0.0436327 5.83784 0.00219405C7.37049 -0.0392446 8.86086 0.507624 10.003 1.53053C11.1458 0.508183 12.6366 -0.0378468 14.1693 0.00455415C15.7021 0.0469551 17.1615 0.674569 18.246 1.75853Z"
      fill="currentColor"
      stroke="none"
    />
  </NavIcon>
)
const IconNavSettings = (p: { size?: number }) => (
  <NavIcon {...p} viewBox="294 18 20 21">
    <path d="M301.79 21.4101C301.842 20.8875 302.097 20.4022 302.506 20.049C302.915 19.6957 303.448 19.5 304 19.5C304.553 19.5 305.086 19.6957 305.495 20.049C305.903 20.4022 306.159 20.8875 306.211 21.4101C306.243 21.7478 306.359 22.0732 306.551 22.3589C306.743 22.6447 307.005 22.8823 307.314 23.0517C307.623 23.2211 307.97 23.3172 308.326 23.332C308.683 23.3468 309.038 23.2799 309.361 23.1367C309.863 22.9201 310.432 22.8888 310.957 23.0488C311.483 23.2088 311.926 23.5487 312.202 24.0024C312.478 24.456 312.566 24.991 312.45 25.5031C312.334 26.0152 312.021 26.4679 311.572 26.773C311.28 26.9676 311.042 27.2261 310.878 27.5267C310.713 27.8273 310.627 28.1612 310.627 28.5C310.627 28.8388 310.713 29.1727 310.878 29.4733C311.042 29.7739 311.28 30.0324 311.572 30.227C312.021 30.5321 312.334 30.9848 312.45 31.4969C312.566 32.009 312.478 32.544 312.202 32.9976C311.926 33.4513 311.483 33.7912 310.957 33.9512C310.432 34.1112 309.863 34.0799 309.361 33.8633C309.038 33.7201 308.683 33.6532 308.326 33.668C307.97 33.6828 307.623 33.7789 307.314 33.9483C307.005 34.1177 306.743 34.3553 306.551 34.6411C306.359 34.9268 306.243 35.2522 306.211 35.5899C306.159 36.1125 305.903 36.5978 305.495 36.951C305.086 37.3043 304.553 37.5 304 37.5C303.448 37.5 302.915 37.3043 302.506 36.951C302.097 36.5978 301.842 36.1125 301.79 35.5899C301.758 35.2521 301.642 34.9265 301.45 34.6407C301.258 34.3549 300.996 34.1172 300.687 33.9478C300.378 33.7784 300.03 33.6822 299.674 33.6675C299.317 33.6528 298.962 33.72 298.639 33.8633C298.137 34.0799 297.568 34.1112 297.043 33.9512C296.517 33.7912 296.074 33.4513 295.798 32.9976C295.522 32.544 295.434 32.009 295.55 31.4969C295.666 30.9848 295.979 30.5321 296.428 30.227C296.72 30.0324 296.958 29.7739 297.122 29.4733C297.287 29.1727 297.373 28.8388 297.373 28.5C297.373 28.1612 297.287 27.8273 297.122 27.5267C296.958 27.2261 296.72 26.9676 296.428 26.773C295.98 26.4677 295.668 26.0152 295.551 25.5035C295.435 24.9917 295.524 24.4572 295.799 24.0038C296.075 23.5505 296.518 23.2106 297.043 23.0504C297.567 22.8901 298.136 22.9209 298.638 23.1367C298.961 23.2799 299.316 23.3468 299.673 23.332C300.029 23.3172 300.376 23.2211 300.685 23.0517C300.995 22.8823 301.256 22.6447 301.448 22.3589C301.64 22.0732 301.756 21.7478 301.788 21.4101M306.847 28.5003C306.847 29.9942 305.572 31.2052 304 31.2052C302.427 31.2052 301.153 29.9942 301.153 28.5003C301.153 27.0065 302.427 25.7955 304 25.7955C305.572 25.7955 306.847 27.0065 306.847 28.5003Z" />
  </NavIcon>
)
const IconLeaf = (p: { size?: number }) => <Icon {...p}><path d="M11 20A7 7 0 0 1 4 13c0-6 5-11 11-11 1 6-3 11-9 13" /><path d="M4 13c0 5 4 7 7 7" /></Icon>
const IconCalendar = (p: { size?: number }) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></Icon>
const IconChevronLeft = (p: { size?: number }) => <Icon {...p}><path d="M15 5l-7 7 7 7" /></Icon>
const IconChevronDown = (p: { size?: number }) => <Icon {...p}><path d="M5 9l7 7 7-7" /></Icon>
const IconX = (p: { size?: number }) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>
const IconCamera = (p: { size?: number }) => <Icon {...p}><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="14" r="3.5" /></Icon>
const IconPlus = (p: { size?: number }) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
const IconMenu = (p: { size?: number }) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>
const IconBell = (p: { size?: number }) => <Icon {...p}><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" /><path d="M10 19a2 2 0 0 0 4 0" /></Icon>
const IconBellOff = (p: { size?: number }) => <Icon {...p}><path d="M6 10a6 6 0 0 1 10.4-4.05M18 10c0 4 1.5 5.5 1.5 5.5H8" /><path d="M6 10v0c0 3-.8 4.4-1.3 5.1a.5.5 0 0 0 .4.9h4.4" /><path d="M10 19a2 2 0 0 0 4 0" /><path d="M3 3l18 18" /></Icon>
const IconCheck = (p: { size?: number }) => <Icon {...p}><path d="M4 12l6 6L20 6" /></Icon>
const IconAlert = (p: { size?: number }) => <Icon {...p}><path d="M10.3 3.9L2.6 18a1.5 1.5 0 0 0 1.3 2.2h16.2a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" /><path d="M12 9v4M12 17h.01" /></Icon>
const IconSparkles = (p: { size?: number }) => <Icon {...p}><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" /></Icon>
const IconDroplet = (p: { size?: number }) => <Icon {...p}><path d="M12 2c3 4 7 9 7 13a7 7 0 1 1-14 0c0-4 4-9 7-13z" /></Icon>
const IconPaw = (p: { size?: number }) => <Icon {...p}><ellipse cx="12" cy="16" rx="5" ry="4.5" /><circle cx="6" cy="9" r="1.6" /><circle cx="11" cy="6" r="1.6" /><circle cx="17" cy="6" r="1.6" /><circle cx="21" cy="9.5" r="1.6" /></Icon>
const IconLock = (p: { size?: number }) => <Icon {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>
const IconSun = (p: { size?: number }) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>
const IconDownload = (p: { size?: number }) => <Icon {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></Icon>
const IconTrash = (p: { size?: number }) => <Icon {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></Icon>
const IconThermometer = (p: { size?: number }) => <Icon {...p}><path d="M14 14.76V4a2 2 0 0 0-4 0v10.76a4 4 0 1 0 4 0z" /></Icon>
const IconDroplets = (p: { size?: number }) => <Icon {...p}><path d="M7 16a4 4 0 0 0 8 0c0-3-4-8-4-8s-4 5-4 8z" /><path d="M15.5 4.5c1.2 1.8 3 4.7 3 6.5" /></Icon>
const IconCalendarSmall = (p: { size?: number }) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></Icon>
const IconDotsHorizontal = (p: { size?: number }) => <Icon {...p}><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" /></Icon>
const IconChevronRight = (p: { size?: number }) => <Icon {...p}><path d="M9 5l7 7-7 7" /></Icon>
const IconGlobe = (p: { size?: number }) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 4 6 4 9s-1.5 6.3-4 9c-2.5-2.7-4-6-4-9s1.5-6.3 4-9z" /></Icon>
const IconRuler = (p: { size?: number }) => <Icon {...p}><rect x="3" y="8" width="18" height="8" rx="1.5" /><path d="M7 8v3M11 8v3M15 8v3" /></Icon>
const IconMail = (p: { size?: number }) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Icon>
const IconMessageCircle = (p: { size?: number }) => <Icon {...p}><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-4-1L3 20l1.5-4.5A8.38 8.38 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z" /></Icon>
// Not built on the shared Icon() wrapper — needs a per-star solid/outline fill, which that wrapper hardcodes to none.
const IconStar = ({ size = 20, filled = false }: { size?: number; filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
    <path d="M12 2.5l2.9 6.4 6.9.7-5.2 4.8 1.5 6.9-6.1-3.6-6.1 3.6 1.5-6.9-5.2-4.8 6.9-.7L12 2.5z" />
  </svg>
)

export { Icon, NavIcon, IconNavHome, IconNavCalendar, IconNavAdd, IconNavHealth, IconNavSettings, IconLeaf, IconCalendar, IconChevronLeft, IconChevronDown, IconX, IconCamera, IconPlus, IconMenu, IconBell, IconBellOff, IconCheck, IconAlert, IconSparkles, IconDroplet, IconPaw, IconLock, IconSun, IconDownload, IconTrash, IconThermometer, IconDroplets, IconCalendarSmall, IconDotsHorizontal, IconChevronRight, IconGlobe, IconRuler, IconMail, IconMessageCircle, IconStar }
