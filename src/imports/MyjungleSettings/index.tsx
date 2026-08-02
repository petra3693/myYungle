import svgPaths from "./svg-doomn8mxv7";

function IosSignal() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="ios-signal">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
        <g id="ios-signal">
          <path clipRule="evenodd" d={svgPaths.p2bb6eb80} fill="#111111" fillRule="evenodd" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function IosWifiSignal() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="ios-wifi-signal">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
        <g id="ios-wifi-signal">
          <path clipRule="evenodd" d={svgPaths.p646c5c0} fill="#111111" fillRule="evenodd" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function IosBatteryFull() {
  return (
    <div className="h-[20px] relative shrink-0 w-[28px]" data-name="ios-battery-full">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 28 20" width="28">
        <g id="ios-battery-full">
          <path d={svgPaths.p66c9640} fill="#111111" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function StatusIcons() {
  return (
    <div className="content-stretch flex gap-[6px] items-center relative shrink-0" data-name="status-icons">
      <IosSignal />
      <IosWifiSignal />
      <IosBatteryFull />
    </div>
  );
}

function StatusBar() {
  return (
    <div className="h-[44px] relative shrink-0 w-full" data-name="status-bar">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[24px] relative size-full">
          <p className="[word-break:break-word] font-['Unbounded:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[12px] whitespace-nowrap">9:41</p>
          <StatusIcons />
        </div>
      </div>
    </div>
  );
}

function LogoGroup() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="logo-group">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[20px] whitespace-nowrap">SETTINGS</p>
    </div>
  );
}

function Settings() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="settings">
      <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
        <g id="settings">
          <path clipRule="evenodd" d={svgPaths.p3b43000} fill="white" fillRule="evenodd" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[18px]" data-name="icon-container">
      <Settings />
    </div>
  );
}

function SettingsButton() {
  return (
    <div className="bg-[#111] content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[38px]" data-name="settings-button">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <IconContainer />
    </div>
  );
}

function HeaderActions() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="header-actions">
      <SettingsButton />
    </div>
  );
}

function BrandHeader() {
  return (
    <div className="relative shrink-0 w-full" data-name="brand-header">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[20px] py-[16px] relative size-full">
          <LogoGroup />
          <HeaderActions />
        </div>
      </div>
    </div>
  );
}

function SectionTitleBar() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="section-title-bar">
      <div className="[word-break:break-word] font-['Unbounded:Bold',sans-serif] font-bold leading-[0] relative shrink-0 text-[#111] text-[14px] uppercase whitespace-nowrap">
        <p className="leading-[normal] mb-0">Notification</p>
        <p className="leading-[normal]">{`Reminder & Routines`}</p>
      </div>
    </div>
  );
}

function PlantsDot() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="plants-dot">
      <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
        <g id="plants-dot">
          <path d={svgPaths.p2c13d500} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function DayCardMon() {
  return (
    <div className="bg-[#00f078] content-stretch flex flex-col gap-[4px] items-center py-[10px] relative rounded-[12px] shrink-0 w-[44px]" data-name="day-card-MON">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">MON</p>
      <PlantsDot />
    </div>
  );
}

function PlantsDot1() {
  return <div className="bg-[rgba(0,0,0,0)] relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot" />;
}

function DayCardTue() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[4px] items-center py-[10px] relative rounded-[12px] shrink-0 w-[44px]" data-name="day-card-TUE">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">TUE</p>
      <PlantsDot1 />
    </div>
  );
}

function PlantsDot2() {
  return <div className="relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot" />;
}

function DayCardWed() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[4px] items-center py-[10px] relative rounded-[12px] shrink-0 w-[44px]" data-name="day-card-WED">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">WED</p>
      <PlantsDot2 />
    </div>
  );
}

function PlantsDot3() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="plants-dot">
      <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
        <g id="plants-dot">
          <path d={svgPaths.p2c13d500} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function DayCardThu() {
  return (
    <div className="bg-[#00f078] content-stretch flex flex-col gap-[4px] items-center py-[10px] relative rounded-[12px] shrink-0 w-[44px]" data-name="day-card-THU">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">THU</p>
      <PlantsDot3 />
    </div>
  );
}

function PlantsDot4() {
  return <div className="bg-[rgba(0,0,0,0)] relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot" />;
}

function DayCardFri() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[4px] items-center py-[10px] relative rounded-[12px] shrink-0 w-[44px]" data-name="day-card-FRI">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">FRI</p>
      <PlantsDot4 />
    </div>
  );
}

function PlantsDot5() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="plants-dot">
      <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
        <g id="plants-dot">
          <path d={svgPaths.p2c13d500} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function DayCardSat() {
  return (
    <div className="bg-[#00f078] content-stretch flex flex-col gap-[4px] items-center py-[10px] relative rounded-[12px] shrink-0 w-[44px]" data-name="day-card-SAT">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">SAT</p>
      <PlantsDot5 />
    </div>
  );
}

function PlantsDot6() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="plants-dot">
      <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
        <g id="plants-dot">
          <path d={svgPaths.p2c13d500} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function DayCardSun() {
  return (
    <div className="bg-[#00f078] content-stretch flex flex-col gap-[4px] items-center py-[10px] relative rounded-[12px] shrink-0 w-[44px]" data-name="day-card-SUN">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">SUN</p>
      <PlantsDot6 />
    </div>
  );
}

function DaysContainer() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="days-container">
      <DayCardMon />
      <DayCardTue />
      <DayCardWed />
      <DayCardThu />
      <DayCardFri />
      <DayCardSat />
      <DayCardSun />
    </div>
  );
}

function WeeklyStrip() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start py-[12px] relative shrink-0 w-full" data-name="weekly-strip">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[12px] whitespace-nowrap">WEEKLY WATER SCHEDULE</p>
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#111] text-[14px] whitespace-nowrap">{`Choose which days you'd like to water`}</p>
      <DaysContainer />
    </div>
  );
}

function SectionTitleBar1() {
  return (
    <div className="content-stretch flex h-[15px] items-start justify-between relative shrink-0 w-[353px]" data-name="section-title-bar">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[12px] uppercase whitespace-nowrap">Push Notification</p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-[262px]">
      <SectionTitleBar1 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#111] text-[14px] whitespace-nowrap">Allow notifications for watering</p>
    </div>
  );
}

function Frame2() {
  return (
    <div className="h-[38px] relative shrink-0 w-[66px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="38" preserveAspectRatio="none" viewBox="0 0 66 38" width="66">
        <g id="Frame 5">
          <rect fill="#00F078" height="36" rx="18" width="64" x="1" y="1" />
          <rect height="36" rx="18" stroke="black" strokeWidth="2" width="64" x="1" y="1" />
          <circle cx="46" cy="19" fill="white" id="Ellipse 1" r="13" stroke="black" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex gap-[25px] items-start relative shrink-0 w-full">
      <Frame1 />
      <Frame2 />
    </div>
  );
}

function PlantsListSection1() {
  return (
    <div className="content-stretch flex flex-col items-start py-[12px] relative shrink-0 w-full" data-name="plants-list-section">
      <Frame />
    </div>
  );
}

function SectionTitleBar2() {
  return (
    <div className="content-stretch flex h-[15px] items-start justify-between relative shrink-0 w-[353px]" data-name="section-title-bar">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[12px] uppercase whitespace-nowrap">Watering Reminder Time</p>
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-[225px]">
      <SectionTitleBar2 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#111] text-[14px] whitespace-nowrap">Alert at this time</p>
    </div>
  );
}

function Frame5() {
  return (
    <div className="bg-white border-2 border-black border-solid content-stretch flex gap-[12px] h-[45px] items-center px-[11px] py-[3px] relative rounded-[9px] shrink-0 w-[103px]">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[16px] text-black whitespace-nowrap">12:30</p>
      <div className="h-[15px] relative shrink-0 w-[16px]" data-name="Vector">
        <svg className="absolute block inset-0 size-full" fill="none" height="15" preserveAspectRatio="none" viewBox="0 0 16 15" width="16">
          <path d={svgPaths.p3c709780} fill="black" id="Vector" />
        </svg>
      </div>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex gap-[25px] items-start relative shrink-0 w-full">
      <Frame4 />
      <Frame5 />
    </div>
  );
}

function PlantsListSection2() {
  return (
    <div className="content-stretch flex flex-col items-start py-[12px] relative shrink-0 w-full" data-name="plants-list-section">
      <Frame3 />
    </div>
  );
}

function PlantsListSection() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start px-[20px] py-[12px] relative shrink-0 w-[393px]" data-name="plants-list-section">
      <SectionTitleBar />
      <WeeklyStrip />
      <PlantsListSection1 />
      <PlantsListSection2 />
    </div>
  );
}

function SectionTitleBar3() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="section-title-bar">
      <p className="[word-break:break-word] font-['Unbounded:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[14px] uppercase whitespace-nowrap">{`Data & Privacy`}</p>
    </div>
  );
}

function Frame7() {
  return (
    <div className="absolute bg-white border-2 border-black border-solid content-stretch flex gap-[12px] h-[35px] items-center left-[237px] px-[11px] py-[3px] rounded-[9px] top-[15px] w-[103px]">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">EXPORT</p>
      <div className="flex items-center justify-center relative shrink-0">
        <div className="flex-none rotate-180">
          <div className="h-[14px] relative w-[13.279px]" data-name="Vector">
            <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 13.2793 14" width="13.2793">
              <path d={svgPaths.p218111f0} fill="black" id="Vector" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame8() {
  return (
    <div className="absolute bg-white border-2 border-[#ff0863] border-solid content-stretch flex h-[35px] items-center left-[271px] px-[11px] py-[3px] rounded-[9px] top-[59px] w-[69px]">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#ff0863] text-[10px] whitespace-nowrap">RESET</p>
    </div>
  );
}

function Frame6() {
  return (
    <div className="bg-white h-[109px] relative rounded-[16px] shrink-0 w-full">
      <div className="overflow-clip relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] absolute font-['Unbounded:Black',sans-serif] font-black leading-[normal] left-[14px] text-[#111] text-[10px] top-[27px] whitespace-nowrap">EXPORT JUNGLE DATA (JSON)</p>
        <p className="[word-break:break-word] absolute font-['Unbounded:Black',sans-serif] font-black leading-[normal] left-[14px] text-[#ff0863] text-[10px] top-[71px] whitespace-nowrap">RESET APP DATA</p>
        <Frame7 />
        <Frame8 />
      </div>
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function WeeklyStrip1() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start py-[12px] relative shrink-0 w-full" data-name="weekly-strip">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[12px] whitespace-nowrap">WEEKLY WATER SCHEDULE</p>
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#111] text-[14px] whitespace-nowrap">{`Choose which days you'd like to water`}</p>
      <Frame6 />
    </div>
  );
}

function PlantsListSection3() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[223px] items-start px-[20px] py-[12px] relative shrink-0 w-[393px]" data-name="plants-list-section">
      <SectionTitleBar3 />
      <WeeklyStrip1 />
    </div>
  );
}

function SectionTitleBar4() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="section-title-bar">
      <p className="[word-break:break-word] font-['Unbounded:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[14px] uppercase whitespace-nowrap">Send Feedback</p>
    </div>
  );
}

function PropText() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[20px] top-[14px] w-[273px]" data-name="prop-text">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#888] text-[14px] whitespace-nowrap">{`Tell us what's on your mind...`}</p>
    </div>
  );
}

function Frame9() {
  return (
    <div className="bg-white h-[46px] relative rounded-[16px] shrink-0 w-full">
      <div className="overflow-clip relative rounded-[inherit] size-full">
        <PropText />
      </div>
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function PropText1() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[20px] top-[14px] w-[273px]" data-name="prop-text">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#888] text-[14px] whitespace-nowrap">{`What went wrong?" / "Describe the issue`}</p>
    </div>
  );
}

function Frame10() {
  return (
    <div className="bg-white h-[46px] relative rounded-[16px] shrink-0 w-full">
      <div className="overflow-clip relative rounded-[inherit] size-full">
        <PropText1 />
      </div>
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function PropText2() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[20px] top-[14px] w-[273px]" data-name="prop-text">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#888] text-[14px] whitespace-nowrap">What would you like to see in the app?</p>
    </div>
  );
}

function Frame11() {
  return (
    <div className="bg-white h-[46px] relative rounded-[16px] shrink-0 w-full">
      <div className="overflow-clip relative rounded-[inherit] size-full">
        <PropText2 />
      </div>
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function SaveButton() {
  return (
    <div className="bg-[#00f078] content-stretch drop-shadow-[4px_4px_0px_#111] flex h-[41px] items-center justify-center relative rounded-[100px] shrink-0 w-full" data-name="save-button">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[12px] whitespace-nowrap">SEND</p>
    </div>
  );
}

function WeeklyStrip2() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] h-[242px] items-start pb-[12px] relative shrink-0 w-full" data-name="weekly-strip">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#111] text-[14px] whitespace-nowrap">{`We'd love to hear from you!`}</p>
      <Frame9 />
      <Frame10 />
      <Frame11 />
      <SaveButton />
    </div>
  );
}

function PlantsListSection4() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[283px] items-start px-[20px] py-[12px] relative shrink-0 w-[393px]" data-name="plants-list-section">
      <SectionTitleBar4 />
      <WeeklyStrip2 />
    </div>
  );
}

function SectionTitleBar5() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="section-title-bar">
      <p className="[word-break:break-word] font-['Unbounded:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[14px] uppercase whitespace-nowrap">MY JUNGLE PRO STATUS</p>
    </div>
  );
}

function Frame13() {
  return <div className="absolute bg-[#efefef] border-2 border-black border-solid h-[10px] left-[14px] rounded-[20px] top-[50px] w-[326px]" />;
}

function Frame14() {
  return <div className="absolute bg-[#00f078] border-2 border-black border-solid h-[10px] left-[14px] rounded-[20px] top-[50px] w-[72px]" />;
}

function Frame12() {
  return (
    <div className="bg-white h-[109px] relative rounded-[16px] shrink-0 w-full">
      <div className="overflow-clip relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] absolute font-['Unbounded:Black',sans-serif] font-black leading-[normal] left-[14px] text-[#111] text-[10px] top-[27px] whitespace-nowrap">FREE TIER</p>
        <p className="[word-break:break-word] absolute font-['Geist:Medium',sans-serif] font-medium leading-[normal] left-[14px] text-[#888] text-[11px] top-[70px] whitespace-nowrap">4 plants slot remaining on free tier.</p>
        <p className="[word-break:break-word] absolute font-['Geist:Bold',sans-serif] font-bold leading-[normal] left-[240px] text-[#888] text-[11px] top-[27px] whitespace-nowrap">1/5 PLANTS USED</p>
        <Frame13 />
        <Frame14 />
      </div>
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function UnlockCtaBtn() {
  return (
    <div className="bg-[#00f078] content-stretch drop-shadow-[4px_4px_0px_#111] flex h-[58px] items-center justify-center relative rounded-[100px] shrink-0 w-full" data-name="unlock-cta-btn">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[12px] whitespace-nowrap">{`UNLOCK PRO FOREVER — $5.99 `}</p>
    </div>
  );
}

function WeeklyStrip3() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start py-[12px] relative shrink-0 w-full" data-name="weekly-strip">
      <Frame12 />
      <UnlockCtaBtn />
    </div>
  );
}

function PlantsListSection5() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start px-[20px] py-[12px] relative shrink-0 w-[393px]" data-name="plants-list-section">
      <SectionTitleBar5 />
      <WeeklyStrip3 />
    </div>
  );
}

function Content() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0" data-name="content">
      <PlantsListSection />
      <PlantsListSection3 />
      <PlantsListSection4 />
      <PlantsListSection5 />
    </div>
  );
}

function HeaderAndContent() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[393px]" data-name="header-and-content">
      <StatusBar />
      <BrandHeader />
      <Content />
    </div>
  );
}

export default function MyjungleSettings() {
  return (
    <div className="bg-[#efefef] content-stretch flex flex-col items-start justify-between relative size-full" data-name="myjungle-settings">
      <HeaderAndContent />
    </div>
  );
}