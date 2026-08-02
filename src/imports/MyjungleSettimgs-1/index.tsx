import svgPaths from "./svg-4vvu7d1j32";

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
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[24px] whitespace-nowrap">MYJUNGLE</p>
    </div>
  );
}

function BrandHeader() {
  return (
    <div className="content-stretch flex items-center justify-center px-[20px] py-[16px] relative shrink-0 w-full" data-name="brand-header">
      <LogoGroup />
    </div>
  );
}

function DropArt() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-center py-[30px] relative shrink-0 w-full" data-name="drop art">
      <div className="h-[116px] relative shrink-0 w-[85px]" data-name="Vector">
        <svg className="absolute block inset-0 size-full" fill="none" height="116" preserveAspectRatio="none" viewBox="0 0 85 116" width="85">
          <path d={svgPaths.p1cd02a80} fill="black" id="Vector" stroke="black" strokeLinecap="round" strokeWidth="2" />
        </svg>
      </div>
      <BrandHeader />
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
    <div className="bg-[#00f078] relative rounded-[12px] shrink-0 w-full" data-name="day-card-MON">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-between px-[20px] py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">MON</p>
          <PlantsDot />
        </div>
      </div>
    </div>
  );
}

function PlantsDot1() {
  return <div className="bg-[rgba(0,0,0,0)] relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot" />;
}

function DayCardTue() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="day-card-TUE">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-between px-[20px] py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">TUE</p>
          <PlantsDot1 />
        </div>
      </div>
    </div>
  );
}

function PlantsDot2() {
  return <div className="relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot" />;
}

function DayCardWed() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="day-card-WED">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-between px-[20px] py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">WED</p>
          <PlantsDot2 />
        </div>
      </div>
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
    <div className="bg-[#00f078] relative rounded-[12px] shrink-0 w-full" data-name="day-card-THU">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-between px-[20px] py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">THU</p>
          <PlantsDot3 />
        </div>
      </div>
    </div>
  );
}

function PlantsDot4() {
  return <div className="bg-[rgba(0,0,0,0)] relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot" />;
}

function DayCardFri() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="day-card-FRI">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-between px-[20px] py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">FRI</p>
          <PlantsDot4 />
        </div>
      </div>
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
    <div className="bg-[#00f078] relative rounded-[12px] shrink-0 w-full" data-name="day-card-SAT">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-between px-[20px] py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">SAT</p>
          <PlantsDot5 />
        </div>
      </div>
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
    <div className="bg-[#00f078] relative rounded-[12px] shrink-0 w-full" data-name="day-card-SUN">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-between px-[20px] py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">SUN</p>
          <PlantsDot6 />
        </div>
      </div>
    </div>
  );
}

function DaysContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[7px] items-start relative shrink-0 w-full" data-name="days-container">
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
    <div className="relative shrink-0 w-full" data-name="weekly-strip">
      <div className="content-stretch flex flex-col gap-[8px] items-start px-[20px] py-[12px] relative size-full">
        <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[12px] whitespace-nowrap">WEEKLY WATER SCHEDULE</p>
        <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#111] text-[14px] whitespace-nowrap">{`Choose which days you'd like to water`}</p>
        <DaysContainer />
      </div>
    </div>
  );
}

function SectionTitleBar() {
  return (
    <div className="content-stretch flex h-[15px] items-start justify-between relative shrink-0 w-[353px]" data-name="section-title-bar">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[12px] uppercase whitespace-nowrap">Push Notification</p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-[262px]">
      <SectionTitleBar />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#111] text-[14px] whitespace-nowrap">Allow notifications for watering</p>
    </div>
  );
}

function Frame2() {
  return (
    <div className="h-[38px] relative shrink-0 w-[66px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="38" preserveAspectRatio="none" viewBox="0 0 66 38" width="66">
        <g id="Frame 5">
          <rect fill="white" height="36" rx="18" width="64" x="1" y="1" />
          <rect height="36" rx="18" stroke="black" strokeWidth="2" width="64" x="1" y="1" />
          <circle cx="20" cy="19" fill="#D9D9D9" id="Ellipse 1" r="13" stroke="black" strokeWidth="2" />
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

function SaveButton() {
  return (
    <div className="bg-[#00f078] content-stretch drop-shadow-[4px_4px_0px_#111] flex flex-[1_0_0] h-[56px] items-center justify-center min-w-px relative rounded-[100px]" data-name="save-button">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[14px] whitespace-nowrap">Start</p>
    </div>
  );
}

function SaveCtaWrapper() {
  return (
    <div className="content-stretch flex items-start pb-[20px] pt-[8px] relative shrink-0 w-full" data-name="save-cta-wrapper">
      <SaveButton />
    </div>
  );
}

function PlantsListSection() {
  return (
    <div className="relative shrink-0 w-full" data-name="plants-list-section">
      <div className="content-stretch flex flex-col gap-[12px] items-start pb-[12px] pt-[52px] px-[20px] relative size-full">
        <Frame />
        <SaveCtaWrapper />
      </div>
    </div>
  );
}

function HeaderAndContent() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[393px]" data-name="header-and-content">
      <StatusBar />
      <DropArt />
      <WeeklyStrip />
      <PlantsListSection />
    </div>
  );
}

export default function MyjungleSettimgs() {
  return (
    <div className="bg-[#efefef] content-stretch flex flex-col items-start justify-between relative size-full" data-name="myjungle-SETTIMGS">
      <HeaderAndContent />
    </div>
  );
}