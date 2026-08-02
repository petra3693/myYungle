import svgPaths from "./svg-frfo2l2sh3";

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

function HeroCloverCollage() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[160px] top-1/2" data-name="hero-clover-collage">
      <svg className="absolute block inset-0 size-full" fill="none" height="160" preserveAspectRatio="none" viewBox="0 0 160 160" width="160">
        <g id="hero-clover-collage">
          <path d={svgPaths.p1e4fc7f0} fill="black" id="Vector" stroke="black" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function PaywallHeroCollage() {
  return (
    <div className="bg-[#00f078] h-[180px] relative shrink-0 w-full" data-name="paywall-hero-collage">
      <div className="content-stretch flex items-start overflow-clip relative rounded-[inherit] size-full">
        <HeroCloverCollage />
      </div>
      <div aria-hidden className="absolute border-[#111] border-b-2 border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function PaywallIntro() {
  return (
    <div className="relative shrink-0 w-full" data-name="paywall-intro">
      <div className="flex flex-col items-center size-full">
        <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-center pb-[12px] pt-[20px] px-[24px] relative size-full text-center">
          <p className="font-['Unbounded:Black',sans-serif] font-black leading-[1.2] min-w-full relative shrink-0 text-[#111] text-[20px] w-[min-content]">NO SUBSCRIPTIONS. UNLIMITED JUNGLE.</p>
          <p className="font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#888] text-[13px] whitespace-nowrap">Take absolute control of your collection offline.</p>
        </div>
      </div>
    </div>
  );
}

function Star() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="star">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g clipPath="url(#clip0_0_6)" id="star">
          <path d={svgPaths.p397b9d00} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_0_6">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function IconContainer() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]" data-name="icon-container">
      <Star />
    </div>
  );
}

function PropBadgeIcon() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[36px]" data-name="prop-badge-icon">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <IconContainer />
    </div>
  );
}

function PropText() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative whitespace-nowrap" data-name="prop-text">
      <p className="font-['Unbounded:Black',sans-serif] font-black relative shrink-0 text-[#111] text-[10px]">UNLIMITED PLANTS</p>
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[#888] text-[11px]">No caps on your growing jungle</p>
    </div>
  );
}

function PropCard() {
  return (
    <div className="bg-white drop-shadow-[4px_4px_0px_#111] relative rounded-[16px] shrink-0 w-full" data-name="prop-card-0">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center p-[12px] relative size-full">
          <PropBadgeIcon />
          <PropText />
        </div>
      </div>
    </div>
  );
}

function Star1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="star">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g clipPath="url(#clip0_0_6)" id="star">
          <path d={svgPaths.p397b9d00} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_0_6">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function IconContainer1() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]" data-name="icon-container">
      <Star1 />
    </div>
  );
}

function PropBadgeIcon1() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[36px]" data-name="prop-badge-icon">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <IconContainer1 />
    </div>
  );
}

function PropText1() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative whitespace-nowrap" data-name="prop-text">
      <p className="font-['Unbounded:Black',sans-serif] font-black relative shrink-0 text-[#111] text-[10px]">GROWTH TIMELINE</p>
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[#888] text-[11px]">Interactive logs of plant status</p>
    </div>
  );
}

function PropCard1() {
  return (
    <div className="bg-white drop-shadow-[4px_4px_0px_#111] relative rounded-[16px] shrink-0 w-full" data-name="prop-card-1">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center p-[12px] relative size-full">
          <PropBadgeIcon1 />
          <PropText1 />
        </div>
      </div>
    </div>
  );
}

function Star2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="star">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g clipPath="url(#clip0_0_6)" id="star">
          <path d={svgPaths.p397b9d00} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_0_6">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function IconContainer2() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]" data-name="icon-container">
      <Star2 />
    </div>
  );
}

function PropBadgeIcon2() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-center justify-center relative rounded-[100px] shrink-0 size-[36px]" data-name="prop-badge-icon">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <IconContainer2 />
    </div>
  );
}

function PropText2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative whitespace-nowrap" data-name="prop-text">
      <p className="font-['Unbounded:Black',sans-serif] font-black relative shrink-0 text-[#111] text-[10px]">{`100% OFFLINE & PRIVATE`}</p>
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[#888] text-[11px]">All data stored strictly on your device</p>
    </div>
  );
}

function PropCard2() {
  return (
    <div className="bg-white drop-shadow-[4px_4px_0px_#111] relative rounded-[16px] shrink-0 w-full" data-name="prop-card-3">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center p-[12px] relative size-full">
          <PropBadgeIcon2 />
          <PropText2 />
        </div>
      </div>
    </div>
  );
}

function ValuePropsList() {
  return (
    <div className="relative shrink-0 w-full" data-name="value-props-list">
      <div className="content-stretch flex flex-col gap-[12px] items-start px-[24px] relative size-full">
        <PropCard />
        <PropCard1 />
        <PropCard2 />
      </div>
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

function PaywallBuySection() {
  return (
    <div className="relative shrink-0 w-full" data-name="paywall-buy-section">
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[10px] items-center px-[24px] py-[20px] relative size-full">
          <UnlockCtaBtn />
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#111] text-[11px] text-center whitespace-nowrap">One-time payment. No monthly fees. Yours forever.</p>
        </div>
      </div>
    </div>
  );
}

function PaywallContentScroll() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="paywall-content-scroll">
      <StatusBar />
      <PaywallHeroCollage />
      <PaywallIntro />
      <ValuePropsList />
      <PaywallBuySection />
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

function IconContainer3() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Home />
    </div>
  );
}

function TabIconWrapper() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer3 />
    </div>
  );
}

function TabBtnHome() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-center justify-center min-w-px py-[4px] relative" data-name="tab-btn-home">
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

function IconContainer4() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Plus />
    </div>
  );
}

function TabIconWrapper1() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer4 />
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

function IconContainer5() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Calendar />
    </div>
  );
}

function TabIconWrapper2() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer5 />
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

function Star3() {
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

function IconContainer6() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Star3 />
    </div>
  );
}

function TabIconWrapper3() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer6 />
    </div>
  );
}

function TabBtnPro() {
  return (
    <div className="bg-[#d1ffe8] content-stretch flex flex-[1_0_0] flex-col gap-[4px] h-[68px] items-center justify-center min-w-px py-[4px] relative" data-name="tab-btn-pro">
      <TabIconWrapper3 />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[8px] uppercase whitespace-nowrap">PRO</p>
    </div>
  );
}

function TabBarContainer() {
  return (
    <div className="bg-white h-[72px] relative shrink-0 w-full" data-name="tab-bar-container">
      <div aria-hidden className="absolute border-[#111] border-solid border-t-2 inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[12px] py-[8px] relative size-full">
          <TabBtnHome />
          <TabBtnAdd />
          <TabBtnBatches />
          <TabBtnPro />
        </div>
      </div>
    </div>
  );
}

export default function MyjungleProPaywall() {
  return (
    <div className="bg-[#efefef] content-stretch flex flex-col items-start justify-between relative size-full" data-name="myjungle-pro-paywall">
      <PaywallContentScroll />
      <TabBarContainer />
    </div>
  );
}