import svgPaths from "./svg-u9kpmn74e6";
import imgInnerImageClip from "./24c699409182c3e5d2a17cf3bf10988ef662ca0c.png";
import imgInnerImageClip1 from "./a629e756f91539ad0cd6c99c620a960b94d6a89d.png";
import imgInnerImageClip2 from "./c1e26fe342a3e4cbf5b479e973ae60ebe8c1d81e.png";
import imgInnerImageClip3 from "./f9057e3acb1771233585613c769e96893a7e8d76.png";

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

function ProBadgeClover() {
  return (
    <div className="bg-[#00f078] content-stretch drop-shadow-[4px_4px_0px_#111] flex gap-[5px] items-center px-[10px] py-[6px] relative rounded-[12px] shrink-0 w-[64px]" data-name="pro-badge-clover">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="h-[10px] relative shrink-0 w-[8px]" data-name="Vector">
        <svg className="absolute block inset-0 size-full" fill="none" height="10" preserveAspectRatio="none" viewBox="0 0 8 10" width="8">
          <path d={svgPaths.p1a37e900} fill="black" id="Vector" />
        </svg>
      </div>
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[11px] whitespace-nowrap">{`PRO `}</p>
    </div>
  );
}

function Settings() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="settings">
      <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
        <g id="settings">
          <path d={svgPaths.p1f61bb80} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
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
    <div className="bg-white content-stretch drop-shadow-[4px_4px_0px_#111] flex items-center justify-center relative rounded-[100px] shrink-0 size-[38px]" data-name="settings-button">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <IconContainer />
    </div>
  );
}

function HeaderActions() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="header-actions">
      <ProBadgeClover />
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

function Droplet() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="24" preserveAspectRatio="none" viewBox="0 0 24 24" width="24">
        <g id="droplet">
          <path d={svgPaths.p32e52500} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer1() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[24px]" data-name="icon-container">
      <Droplet />
    </div>
  );
}

function BannerInner() {
  return (
    <div className="bg-[#00f078] drop-shadow-[4px_4px_0px_#111] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="banner-inner">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center px-[16px] py-[14px] relative size-full">
          <IconContainer1 />
          <p className="[word-break:break-word] flex-[1_0_0] font-['Unbounded:Black',sans-serif] font-black leading-[1.2] min-w-px relative text-[#111] text-[14px]">4 PLANTS NEED WATER TODAY!</p>
        </div>
      </div>
    </div>
  );
}

function UrgentAlertBanner() {
  return (
    <div className="relative shrink-0 w-full" data-name="urgent-alert-banner">
      <div className="content-stretch flex items-start pb-[12px] pt-[39px] px-[20px] relative size-full">
        <BannerInner />
      </div>
    </div>
  );
}

function PlantsDot() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#888] text-[10px] whitespace-nowrap">0</p>
    </div>
  );
}

function DayCardMon() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[4px] items-center py-[10px] relative rounded-[12px] shrink-0 w-[44px]" data-name="day-card-MON">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">MON</p>
      <PlantsDot />
    </div>
  );
}

function PlantsDot1() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#888] text-[10px] whitespace-nowrap">0</p>
    </div>
  );
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
  return (
    <div className="bg-white content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[10px] text-black whitespace-nowrap">4</p>
    </div>
  );
}

function DayCardWed() {
  return (
    <div className="bg-black content-stretch flex flex-col gap-[4px] items-center py-[10px] relative rounded-[12px] shrink-0 w-[44px]" data-name="day-card-WED">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[10px] text-white whitespace-nowrap">WED</p>
      <PlantsDot2 />
    </div>
  );
}

function PlantsDot3() {
  return (
    <div className="bg-[#111] content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#00f078] text-[10px] whitespace-nowrap">2</p>
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
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#888] text-[10px] whitespace-nowrap">0</p>
    </div>
  );
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
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#888] text-[10px] whitespace-nowrap">0</p>
    </div>
  );
}

function DayCardSat() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[4px] items-center py-[10px] relative rounded-[12px] shrink-0 w-[44px]" data-name="day-card-SAT">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">SAT</p>
      <PlantsDot5 />
    </div>
  );
}

function PlantsDot6() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#888] text-[10px] whitespace-nowrap">0</p>
    </div>
  );
}

function DayCardSun() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[4px] items-center py-[10px] relative rounded-[12px] shrink-0 w-[44px]" data-name="day-card-SUN">
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
    <div className="relative shrink-0 w-full" data-name="weekly-strip">
      <div className="content-stretch flex flex-col gap-[8px] items-start px-[20px] py-[12px] relative size-full">
        <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[12px] whitespace-nowrap">WEEKLY WATER SCHEDULE</p>
        <DaysContainer />
      </div>
    </div>
  );
}

function SectionTitleBar() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="section-title-bar">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[14px] whitespace-nowrap">MY SPECIMENS (6)</p>
    </div>
  );
}

function Clover() {
  return <div className="absolute left-0 size-[54px] top-0" data-name="clover" />;
}

function InnerImageClip() {
  return (
    <div className="relative rounded-[36px] shrink-0 size-[54px]" data-name="inner-image-clip">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[36px] size-full" src={imgInnerImageClip} />
    </div>
  );
}

function CloverFrameWrapper() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[54px]" data-name="clover-frame-wrapper">
      <Clover />
      <InnerImageClip />
    </div>
  );
}

function TagRoom() {
  return (
    <div className="bg-[#efefef] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[6px] shrink-0" data-name="tag-room">
      <div aria-hidden className="absolute border border-[#111] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[9px] whitespace-nowrap">LIVING ROOM</p>
    </div>
  );
}

function TagBatch() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[6px] shrink-0" data-name="tag-batch">
      <div aria-hidden className="absolute border border-[#111] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[9px] whitespace-nowrap">{`THURSDAY `}</p>
    </div>
  );
}

function TagsRow() {
  return (
    <div className="content-stretch flex gap-[4px] items-start relative shrink-0" data-name="tags-row">
      <TagRoom />
      <TagBatch />
    </div>
  );
}

function Droplet1() {
  return (
    <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 12 20" width="12">
        <g id="droplet">
          <path d={svgPaths.p35497c00} fill="#00F078" id="Vector" stroke="#00F078" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer2() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet1 />
    </div>
  );
}

function Droplet2() {
  return <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet" />;
}

function IconContainer3() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet2 />
    </div>
  );
}

function Droplet3() {
  return <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet" />;
}

function IconContainer4() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet3 />
    </div>
  );
}

function Drops() {
  return (
    <div className="content-stretch flex gap-[5px] h-[16px] items-end relative shrink-0" data-name="drops">
      <IconContainer2 />
      <IconContainer3 />
      <IconContainer4 />
    </div>
  );
}

function PlantMeta() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px relative" data-name="plant-meta">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] min-w-full overflow-hidden relative shrink-0 text-[#111] text-[12px] text-ellipsis w-[min-content] whitespace-nowrap">MONSTERA DELICIOSA</p>
      <TagsRow />
      <Drops />
    </div>
  );
}

function Check() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer5() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[18px]" data-name="icon-container">
      <Check />
    </div>
  );
}

function QuickWaterBtn() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[40px]" data-name="quick-water-btn">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <IconContainer5 />
    </div>
  );
}

function PlantCard() {
  return (
    <div className="bg-white relative rounded-[16px] shrink-0 w-full" data-name="plant-card-0">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center p-[12px] relative size-full">
          <CloverFrameWrapper />
          <PlantMeta />
          <QuickWaterBtn />
        </div>
      </div>
    </div>
  );
}

function Clover1() {
  return <div className="absolute left-0 size-[54px] top-0" data-name="clover" />;
}

function InnerImageClip1() {
  return (
    <div className="relative rounded-[36px] shrink-0 size-[54px]" data-name="inner-image-clip">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[36px] size-full" src={imgInnerImageClip1} />
    </div>
  );
}

function CloverFrameWrapper1() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[54px]" data-name="clover-frame-wrapper">
      <Clover1 />
      <InnerImageClip1 />
    </div>
  );
}

function TagRoom1() {
  return (
    <div className="bg-[#efefef] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[6px] shrink-0" data-name="tag-room">
      <div aria-hidden className="absolute border border-[#111] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[9px] whitespace-nowrap">OFFICE</p>
    </div>
  );
}

function TagBatch1() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[6px] shrink-0" data-name="tag-batch">
      <div aria-hidden className="absolute border border-[#111] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[9px] whitespace-nowrap">THURSDAY</p>
    </div>
  );
}

function TagsRow1() {
  return (
    <div className="content-stretch flex gap-[4px] items-start relative shrink-0" data-name="tags-row">
      <TagRoom1 />
      <TagBatch1 />
    </div>
  );
}

function Droplet4() {
  return (
    <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 12 20" width="12">
        <g id="droplet">
          <path d={svgPaths.p35497c00} fill="#00F078" id="Vector" stroke="#00F078" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer6() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet4 />
    </div>
  );
}

function Droplet5() {
  return <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet" />;
}

function IconContainer7() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet5 />
    </div>
  );
}

function Droplet6() {
  return <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet" />;
}

function IconContainer8() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet6 />
    </div>
  );
}

function Drops1() {
  return (
    <div className="content-stretch flex gap-[5px] h-[16px] items-end relative shrink-0" data-name="drops">
      <IconContainer6 />
      <IconContainer7 />
      <IconContainer8 />
    </div>
  );
}

function PlantMeta1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px relative" data-name="plant-meta">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] min-w-full overflow-hidden relative shrink-0 text-[#111] text-[12px] text-ellipsis w-[min-content] whitespace-nowrap">FIDDLE LEAF FIG</p>
      <TagsRow1 />
      <Drops1 />
    </div>
  );
}

function Check1() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer9() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[18px]" data-name="icon-container">
      <Check1 />
    </div>
  );
}

function QuickWaterBtn1() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[40px]" data-name="quick-water-btn">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <IconContainer9 />
    </div>
  );
}

function PlantCard3() {
  return (
    <div className="bg-white relative rounded-[16px] shrink-0 w-full" data-name="plant-card-3">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center p-[12px] relative size-full">
          <CloverFrameWrapper1 />
          <PlantMeta1 />
          <QuickWaterBtn1 />
        </div>
      </div>
    </div>
  );
}

function Clover2() {
  return <div className="absolute left-0 size-[54px] top-0" data-name="clover" />;
}

function InnerImageClip2() {
  return (
    <div className="relative rounded-[36px] shrink-0 size-[54px]" data-name="inner-image-clip">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[36px] size-full" src={imgInnerImageClip1} />
    </div>
  );
}

function CloverFrameWrapper2() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[54px]" data-name="clover-frame-wrapper">
      <Clover2 />
      <InnerImageClip2 />
    </div>
  );
}

function TagRoom2() {
  return (
    <div className="bg-[#efefef] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[6px] shrink-0" data-name="tag-room">
      <div aria-hidden className="absolute border border-[#111] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[9px] whitespace-nowrap">OFFICE</p>
    </div>
  );
}

function TagBatch2() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[6px] shrink-0" data-name="tag-batch">
      <div aria-hidden className="absolute border border-[#111] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[9px] whitespace-nowrap">WEDNESDAY</p>
    </div>
  );
}

function TagsRow2() {
  return (
    <div className="content-stretch flex gap-[4px] items-start relative shrink-0" data-name="tags-row">
      <TagRoom2 />
      <TagBatch2 />
    </div>
  );
}

function Droplet7() {
  return (
    <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 12 20" width="12">
        <g id="droplet">
          <path d={svgPaths.p35497c00} fill="#00F078" id="Vector" stroke="#00F078" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer10() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet7 />
    </div>
  );
}

function Droplet8() {
  return <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet" />;
}

function IconContainer11() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet8 />
    </div>
  );
}

function Droplet9() {
  return <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet" />;
}

function IconContainer12() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet9 />
    </div>
  );
}

function Drops2() {
  return (
    <div className="content-stretch flex gap-[5px] h-[16px] items-end relative shrink-0" data-name="drops">
      <IconContainer10 />
      <IconContainer11 />
      <IconContainer12 />
    </div>
  );
}

function PlantMeta2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px relative" data-name="plant-meta">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] min-w-full overflow-hidden relative shrink-0 text-[#111] text-[12px] text-ellipsis w-[min-content] whitespace-nowrap">FIDDLE LEAF FIG</p>
      <TagsRow2 />
      <Drops2 />
    </div>
  );
}

function Check2() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer13() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[18px]" data-name="icon-container">
      <Check2 />
    </div>
  );
}

function QuickWaterBtn2() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[40px]" data-name="quick-water-btn">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <IconContainer13 />
    </div>
  );
}

function PlantCard4() {
  return (
    <div className="bg-white relative rounded-[16px] shrink-0 w-full" data-name="plant-card-3">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center p-[12px] relative size-full">
          <CloverFrameWrapper2 />
          <PlantMeta2 />
          <QuickWaterBtn2 />
        </div>
      </div>
    </div>
  );
}

function Group1() {
  return (
    <div className="col-1 h-[79px] ml-[258px] mt-0 relative row-1 w-[95px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="79" preserveAspectRatio="none" viewBox="0 0 95 79" width="95">
        <g id="Group 3">
          <path d={svgPaths.p37ca1b00} fill="#FF0863" id="Rectangle 3" stroke="#111111" strokeWidth="2" />
          <path d={svgPaths.p36f8ca80} fill="white" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Clover3() {
  return <div className="absolute left-0 size-[54px] top-0" data-name="clover" />;
}

function InnerImageClip3() {
  return (
    <div className="relative rounded-[36px] shrink-0 size-[54px]" data-name="inner-image-clip">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[36px] size-full" src={imgInnerImageClip2} />
    </div>
  );
}

function CloverFrameWrapper3() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[54px]" data-name="clover-frame-wrapper">
      <Clover3 />
      <InnerImageClip3 />
    </div>
  );
}

function TagRoom3() {
  return (
    <div className="bg-[#efefef] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[6px] shrink-0" data-name="tag-room">
      <div aria-hidden className="absolute border border-[#111] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[9px] whitespace-nowrap">BEDROOM</p>
    </div>
  );
}

function TagBatch3() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[6px] shrink-0" data-name="tag-batch">
      <div aria-hidden className="absolute border border-[#111] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[9px] whitespace-nowrap">WEDNESDAY</p>
    </div>
  );
}

function TagsRow3() {
  return (
    <div className="content-stretch flex gap-[4px] items-start relative shrink-0" data-name="tags-row">
      <TagRoom3 />
      <TagBatch3 />
    </div>
  );
}

function Droplet10() {
  return (
    <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 12 20" width="12">
        <g id="droplet">
          <path d={svgPaths.p35497c00} fill="#00F078" id="Vector" stroke="#00F078" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer14() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet10 />
    </div>
  );
}

function Droplet11() {
  return (
    <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 12 20" width="12">
        <g id="droplet">
          <path d={svgPaths.p35497c00} fill="#00F078" id="Vector" stroke="#00F078" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer15() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet11 />
    </div>
  );
}

function Droplet12() {
  return <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet" />;
}

function IconContainer16() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet12 />
    </div>
  );
}

function Drops3() {
  return (
    <div className="content-stretch flex gap-[5px] h-[16px] items-end relative shrink-0" data-name="drops">
      <IconContainer14 />
      <IconContainer15 />
      <IconContainer16 />
    </div>
  );
}

function PlantMeta3() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-[136px]" data-name="plant-meta">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] min-w-full overflow-hidden relative shrink-0 text-[#111] text-[12px] text-ellipsis w-[min-content] whitespace-nowrap">SNAKE PLANT</p>
      <TagsRow3 />
      <Drops3 />
    </div>
  );
}

function Check3() {
  return (
    <div className="relative shrink-0 size-[27px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" height="27" preserveAspectRatio="none" viewBox="0 0 27 27" width="27">
        <g id="check">
          <path d={svgPaths.p64f2600} fill="#00F078" id="Vector" stroke="black" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer17() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[18px]" data-name="icon-container">
      <Check3 />
    </div>
  );
}

function QuickWaterBtn3() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[40px]" data-name="quick-water-btn">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <IconContainer17 />
    </div>
  );
}

function PlantCard1() {
  return (
    <div className="bg-[#d1ffe8] col-1 content-stretch flex gap-[12px] items-center ml-0 mt-0 p-[12px] relative rounded-[16px] row-1 w-[286px]" data-name="plant-card-1">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <CloverFrameWrapper3 />
      <PlantMeta3 />
      <QuickWaterBtn3 />
    </div>
  );
}

function Group() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <Group1 />
      <PlantCard1 />
    </div>
  );
}

function Clover4() {
  return <div className="absolute left-0 size-[54px] top-0" data-name="clover" />;
}

function InnerImageClip4() {
  return (
    <div className="relative rounded-[36px] shrink-0 size-[54px]" data-name="inner-image-clip">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[36px] size-full" src={imgInnerImageClip3} />
    </div>
  );
}

function CloverFrameWrapper4() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[54px]" data-name="clover-frame-wrapper">
      <Clover4 />
      <InnerImageClip4 />
    </div>
  );
}

function TagRoom4() {
  return (
    <div className="bg-[#efefef] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[6px] shrink-0" data-name="tag-room">
      <div aria-hidden className="absolute border border-[#111] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[9px] whitespace-nowrap">KITCHEN</p>
    </div>
  );
}

function TagBatch4() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[6px] shrink-0" data-name="tag-batch">
      <div aria-hidden className="absolute border border-[#111] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[9px] whitespace-nowrap">WEDNESDAY</p>
    </div>
  );
}

function TagsRow4() {
  return (
    <div className="content-stretch flex gap-[4px] items-start relative shrink-0" data-name="tags-row">
      <TagRoom4 />
      <TagBatch4 />
    </div>
  );
}

function Droplet13() {
  return (
    <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 12 20" width="12">
        <g id="droplet">
          <path d={svgPaths.p35497c00} fill="#00F078" id="Vector" stroke="#00F078" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer18() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet13 />
    </div>
  );
}

function Droplet14() {
  return (
    <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 12 20" width="12">
        <g id="droplet">
          <path d={svgPaths.p35497c00} fill="#00F078" id="Vector" stroke="#00F078" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer19() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet14 />
    </div>
  );
}

function Droplet15() {
  return (
    <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 12 20" width="12">
        <g id="droplet">
          <path d={svgPaths.p35497c00} fill="#00F078" id="Vector" stroke="#00F078" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer20() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet15 />
    </div>
  );
}

function Drops4() {
  return (
    <div className="content-stretch flex gap-[5px] h-[16px] items-end relative shrink-0" data-name="drops">
      <IconContainer18 />
      <IconContainer19 />
      <IconContainer20 />
    </div>
  );
}

function PlantMeta4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px relative" data-name="plant-meta">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] min-w-full overflow-hidden relative shrink-0 text-[#111] text-[12px] text-ellipsis w-[min-content] whitespace-nowrap">CALATHEA ORNATA</p>
      <TagsRow4 />
      <Drops4 />
    </div>
  );
}

function Check4() {
  return (
    <div className="relative shrink-0 size-[27px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" height="27" preserveAspectRatio="none" viewBox="0 0 27 27" width="27">
        <g id="check">
          <path d={svgPaths.p64f2600} fill="#00F078" id="Vector" stroke="black" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer21() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[18px]" data-name="icon-container">
      <Check4 />
    </div>
  );
}

function QuickWaterBtn4() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[40px]" data-name="quick-water-btn">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <IconContainer21 />
    </div>
  );
}

function PlantCard2() {
  return (
    <div className="bg-[#d1ffe8] relative rounded-[16px] shrink-0 w-full" data-name="plant-card-2">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center p-[12px] relative size-full">
          <CloverFrameWrapper4 />
          <PlantMeta4 />
          <QuickWaterBtn4 />
        </div>
      </div>
    </div>
  );
}

function Clover5() {
  return <div className="absolute left-0 size-[54px] top-0" data-name="clover" />;
}

function InnerImageClip5() {
  return (
    <div className="relative rounded-[36px] shrink-0 size-[54px]" data-name="inner-image-clip">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[36px] size-full" src={imgInnerImageClip1} />
    </div>
  );
}

function CloverFrameWrapper5() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[54px]" data-name="clover-frame-wrapper">
      <Clover5 />
      <InnerImageClip5 />
    </div>
  );
}

function TagRoom5() {
  return (
    <div className="bg-[#efefef] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[6px] shrink-0" data-name="tag-room">
      <div aria-hidden className="absolute border border-[#111] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[9px] whitespace-nowrap">OFFICE</p>
    </div>
  );
}

function TagBatch5() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[6px] shrink-0" data-name="tag-batch">
      <div aria-hidden className="absolute border border-[#111] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[9px] whitespace-nowrap">WEDNESDAY</p>
    </div>
  );
}

function TagsRow5() {
  return (
    <div className="content-stretch flex gap-[4px] items-start relative shrink-0" data-name="tags-row">
      <TagRoom5 />
      <TagBatch5 />
    </div>
  );
}

function Droplet16() {
  return (
    <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 12 20" width="12">
        <g id="droplet">
          <path d={svgPaths.p35497c00} fill="#00F078" id="Vector" stroke="#00F078" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer22() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet16 />
    </div>
  );
}

function Droplet17() {
  return <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet" />;
}

function IconContainer23() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet17 />
    </div>
  );
}

function Droplet18() {
  return <div className="h-[20px] relative shrink-0 w-[12px]" data-name="droplet" />;
}

function IconContainer24() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet18 />
    </div>
  );
}

function Drops5() {
  return (
    <div className="content-stretch flex gap-[5px] h-[16px] items-end relative shrink-0" data-name="drops">
      <IconContainer22 />
      <IconContainer23 />
      <IconContainer24 />
    </div>
  );
}

function PlantMeta5() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px relative" data-name="plant-meta">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] min-w-full overflow-hidden relative shrink-0 text-[#111] text-[12px] text-ellipsis w-[min-content] whitespace-nowrap">FIDDLE LEAF FIG</p>
      <TagsRow5 />
      <Drops5 />
    </div>
  );
}

function Check5() {
  return (
    <div className="relative shrink-0 size-[27px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" height="27" preserveAspectRatio="none" viewBox="0 0 27 27" width="27">
        <g id="check">
          <path d={svgPaths.p64f2600} fill="#00F078" id="Vector" stroke="black" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer25() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[18px]" data-name="icon-container">
      <Check5 />
    </div>
  );
}

function QuickWaterBtn5() {
  return (
    <div className="bg-white content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[40px]" data-name="quick-water-btn">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <IconContainer25 />
    </div>
  );
}

function PlantCard5() {
  return (
    <div className="bg-[#d1ffe8] relative rounded-[16px] shrink-0 w-full" data-name="plant-card-3">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center p-[12px] relative size-full">
          <CloverFrameWrapper5 />
          <PlantMeta5 />
          <QuickWaterBtn5 />
        </div>
      </div>
    </div>
  );
}

function VerticalList() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full" data-name="vertical-list">
      <PlantCard />
      <PlantCard3 />
      <PlantCard4 />
      <Group />
      <PlantCard2 />
      <PlantCard5 />
    </div>
  );
}

function SaveButton() {
  return (
    <div className="bg-[#00f078] content-stretch drop-shadow-[4px_4px_0px_#111] flex flex-[1_0_0] h-[56px] items-center justify-center min-w-px relative rounded-[100px]" data-name="save-button">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[14px] whitespace-nowrap">+ ADD PLANT</p>
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
      <div className="content-stretch flex flex-col gap-[12px] items-start px-[20px] py-[12px] relative size-full">
        <SectionTitleBar />
        <VerticalList />
        <SaveCtaWrapper />
      </div>
    </div>
  );
}

function HeaderAndContent() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[393px]" data-name="header-and-content">
      <StatusBar />
      <BrandHeader />
      <UrgentAlertBanner />
      <WeeklyStrip />
      <PlantsListSection />
    </div>
  );
}

function Home() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="home">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
        <g id="home">
          <path d={svgPaths.p2046d6b0} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer26() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Home />
    </div>
  );
}

function TabIconWrapper() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer26 />
    </div>
  );
}

function TabBtnHome() {
  return (
    <div className="bg-[#d1ffe8] content-stretch flex flex-[1_0_0] flex-col gap-[4px] h-[68px] items-center justify-center min-w-px py-[4px] relative" data-name="tab-btn-home">
      <TabIconWrapper />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[8px] uppercase whitespace-nowrap">MY JUNGLE</p>
    </div>
  );
}

function Plus() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer27() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Plus />
    </div>
  );
}

function TabIconWrapper1() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer27 />
    </div>
  );
}

function TabBtnAdd() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-center justify-center min-w-px py-[4px] relative" data-name="tab-btn-add">
      <TabIconWrapper1 />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[8px] uppercase whitespace-nowrap">ADD NEW</p>
    </div>
  );
}

function Calendar() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="calendar">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
        <g id="calendar">
          <path d={svgPaths.p376ce800} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer28() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Calendar />
    </div>
  );
}

function TabIconWrapper2() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer28 />
    </div>
  );
}

function TabBtnBatches() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-center justify-center min-w-px py-[4px] relative" data-name="tab-btn-batches">
      <TabIconWrapper2 />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[8px] uppercase whitespace-nowrap">Watering</p>
    </div>
  );
}

function Star() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="star">
      <svg className="absolute block inset-0 size-full" fill="none" height="20" preserveAspectRatio="none" viewBox="0 0 20 20" width="20">
        <g id="star">
          <path d={svgPaths.p1eebb470} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer29() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Star />
    </div>
  );
}

function TabIconWrapper3() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer29 />
    </div>
  );
}

function TabBtnPro() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-center justify-center min-w-px py-[4px] relative" data-name="tab-btn-pro">
      <TabIconWrapper3 />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[8px] uppercase whitespace-nowrap">PRO</p>
    </div>
  );
}

function TabBarContainer() {
  return (
    <div className="bg-white content-stretch flex h-[72px] items-center justify-between px-[12px] relative shrink-0 w-[393px]" data-name="tab-bar-container">
      <div aria-hidden className="absolute border-[#111] border-solid border-t-2 inset-0 pointer-events-none" />
      <TabBtnHome />
      <TabBtnAdd />
      <TabBtnBatches />
      <TabBtnPro />
    </div>
  );
}

export default function MyjungleSettimgs() {
  return (
    <div className="bg-[#efefef] content-stretch flex flex-col items-start justify-between relative size-full" data-name="myjungle-SETTIMGS">
      <HeaderAndContent />
      <TabBarContainer />
    </div>
  );
}