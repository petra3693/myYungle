import svgPaths from "./svg-fer892chf7";

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

function ModalHeader() {
  return (
    <div className="content-stretch flex flex-col items-center pb-[16px] pt-[8px] relative shrink-0 w-full" data-name="modal-header">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[18px] whitespace-nowrap">{`ADD NEW `}</p>
    </div>
  );
}

function MaterialSymbolsAddAPhotoOutlineRounded() {
  return (
    <div className="absolute left-[20px] size-[24px] top-[20px]" data-name="material-symbols:add-a-photo-outline-rounded">
      <svg className="absolute block inset-0 size-full" fill="none" height="24" preserveAspectRatio="none" viewBox="0 0 24 24" width="24">
        <g id="material-symbols:add-a-photo-outline-rounded">
          <path d={svgPaths.p22b7c700} fill="black" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function InnerImageClip() {
  return (
    <div className="bg-[#efefef] content-stretch flex items-start overflow-clip relative rounded-[39px] shrink-0 size-[64px]" data-name="inner-image-clip">
      <MaterialSymbolsAddAPhotoOutlineRounded />
    </div>
  );
}

function CloverFrameWrapper() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[64px]" data-name="clover-frame-wrapper">
      <InnerImageClip />
    </div>
  );
}

function BtnPlus() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[8px] shrink-0" data-name="btn-plus">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">+ TAKE PHOTO</p>
    </div>
  );
}

function UploadButtons() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="upload-buttons">
      <BtnPlus />
    </div>
  );
}

function UploadAction() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[6px] items-start min-w-px relative" data-name="upload-action">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[11px] uppercase whitespace-nowrap">Your Plant’s Photo</p>
      <UploadButtons />
    </div>
  );
}

function PhotoUploadContainer() {
  return (
    <div className="bg-white drop-shadow-[4px_4px_0px_#111] relative rounded-[20px] shrink-0 w-full" data-name="photo-upload-container">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center p-[16px] relative size-full">
          <CloverFrameWrapper />
          <UploadAction />
        </div>
      </div>
    </div>
  );
}

function InputNameBox() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="input-name-box">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex items-start p-[14px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#111] text-[14px] whitespace-nowrap">Pilea Peperomioides</p>
      </div>
    </div>
  );
}

function FieldName() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0 w-full" data-name="field-name">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[11px] whitespace-nowrap">PLANT NAME *</p>
      <InputNameBox />
    </div>
  );
}

function InputRoomBox() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="input-room-box">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex items-start p-[14px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#888] text-[14px] whitespace-nowrap">e.g. Living Room, Kitchen</p>
      </div>
    </div>
  );
}

function FieldRoom() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0 w-full" data-name="field-room">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[11px] whitespace-nowrap">ROOM LOCATION</p>
      <InputRoomBox />
    </div>
  );
}

function InputRoomBox1() {
  return (
    <div className="bg-white h-[96px] relative rounded-[12px] shrink-0 w-full" data-name="input-room-box">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex items-start p-[14px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#888] text-[14px] whitespace-nowrap">Optional care notes for this plant</p>
      </div>
    </div>
  );
}

function FieldRoom1() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0 w-full" data-name="field-room">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[11px] uppercase whitespace-nowrap">Care Note (max 500 Ca.)</p>
      <InputRoomBox1 />
    </div>
  );
}

function InputsGroup() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="inputs-group">
      <FieldName />
      <FieldRoom />
      <FieldRoom1 />
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
          <PlantsDot1 />
        </div>
      </div>
    </div>
  );
}

function PlantsDot2() {
  return <div className="bg-[rgba(0,0,0,0)] relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot" />;
}

function DayCardSat() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="day-card-SAT">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-between px-[20px] py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">SAT</p>
          <PlantsDot2 />
        </div>
      </div>
    </div>
  );
}

function PlantsDot3() {
  return <div className="bg-[rgba(0,0,0,0)] relative rounded-[100px] shrink-0 size-[18px]" data-name="plants-dot" />;
}

function DayCardSun() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="day-card-SUN">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-between px-[20px] py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">SUN</p>
          <PlantsDot3 />
        </div>
      </div>
    </div>
  );
}

function DaysContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[7px] items-start relative shrink-0 w-full" data-name="days-container">
      <DayCardMon />
      <DayCardThu />
      <DayCardSat />
      <DayCardSun />
    </div>
  );
}

function BatchSelectorSection() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="batch-selector-section">
      <div className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[0] relative shrink-0 text-[#111] text-[11px] uppercase whitespace-nowrap">
        <p className="leading-[normal] mb-0 whitespace-pre">How often does your plant need</p>
        <p className="leading-[normal] whitespace-pre">{`to be watered?  *`}</p>
      </div>
      <DaysContainer />
    </div>
  );
}

function Droplet() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="droplet">
          <path d={svgPaths.p13e3d5f0} fill="#00F078" id="Vector" stroke="#00F078" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[12px]" data-name="icon-container">
      <Droplet />
    </div>
  );
}

function PillLight() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[2px] items-start justify-center min-w-px py-[10px] relative rounded-[8px]" data-name="pill-LIGHT">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">LIGHT</p>
      <IconContainer />
    </div>
  );
}

function Droplet1() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="droplet">
          <path d={svgPaths.p13e3d5f0} fill="black" id="Vector" stroke="black" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer1() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[12px]" data-name="icon-container">
      <Droplet1 />
    </div>
  );
}

function Droplet2() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="droplet">
          <path d={svgPaths.p13e3d5f0} fill="black" id="Vector" stroke="black" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer2() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[12px]" data-name="icon-container">
      <Droplet2 />
    </div>
  );
}

function PillModerate() {
  return (
    <div className="bg-[#00f078] content-stretch flex gap-[2px] h-[37px] items-center justify-center py-[10px] relative rounded-[8px] shrink-0 w-[135px]" data-name="pill-MODERATE">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">MODERATE</p>
      <IconContainer1 />
      <IconContainer2 />
    </div>
  );
}

function Droplet3() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="droplet">
          <path d={svgPaths.p13e3d5f0} fill="#00F078" id="Vector" stroke="#00F078" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer3() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[12px]" data-name="icon-container">
      <Droplet3 />
    </div>
  );
}

function Droplet4() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="droplet">
          <path d={svgPaths.p13e3d5f0} fill="#00F078" id="Vector" stroke="#00F078" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer4() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[12px]" data-name="icon-container">
      <Droplet4 />
    </div>
  );
}

function Droplet5() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="droplet">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="droplet">
          <path d={svgPaths.p13e3d5f0} fill="#00F078" id="Vector" stroke="#00F078" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer5() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[12px]" data-name="icon-container">
      <Droplet5 />
    </div>
  );
}

function PillHeavy() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[2px] items-start justify-center min-w-px py-[10px] relative rounded-[8px]" data-name="pill-HEAVY">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[10px] whitespace-nowrap">HEAVY</p>
      <IconContainer3 />
      <IconContainer4 />
      <IconContainer5 />
    </div>
  );
}

function SegmentedRow() {
  return (
    <div className="bg-white h-[37px] relative rounded-[12px] shrink-0 w-full" data-name="segmented-row">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[4px] relative size-full">
          <PillLight />
          <PillModerate />
          <PillHeavy />
        </div>
      </div>
    </div>
  );
}

function WaterNeedsSection() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="water-needs-section">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[11px] uppercase whitespace-pre">{`How much water does your plant need?  *`}</p>
      <SegmentedRow />
    </div>
  );
}

function Frame1() {
  return <div className="absolute bg-[#efefef] border-2 border-black border-solid h-[10px] left-[14px] rounded-[20px] top-[50px] w-[326px]" />;
}

function Frame2() {
  return <div className="absolute bg-[#00f078] border-2 border-black border-solid h-[10px] left-[14px] rounded-[20px] top-[50px] w-[72px]" />;
}

function Frame() {
  return (
    <div className="h-[109px] overflow-clip relative rounded-[16px] shrink-0 w-full">
      <p className="[word-break:break-word] absolute font-['Unbounded:Black',sans-serif] font-black leading-[normal] left-[14px] text-[#111] text-[10px] top-[27px] whitespace-nowrap">FREE TIER</p>
      <p className="[word-break:break-word] absolute font-['Geist:Medium',sans-serif] font-medium leading-[0] left-[14px] text-[#888] text-[11px] top-[70px] whitespace-nowrap">
        <span className="leading-[normal]">{`4 slots remaining. `}</span>
        <span className="[text-decoration-skip-ink:none] [text-underline-position:from-font] decoration-from-font decoration-solid font-['Geist:Bold',sans-serif] font-bold leading-[normal] text-[#040404] underline">Upgrade to add unlimited plants</span>
      </p>
      <p className="[word-break:break-word] absolute font-['Geist:Bold',sans-serif] font-bold leading-[normal] left-[240px] text-[#888] text-[11px] top-[27px] whitespace-nowrap">1/5 PLANTS USED</p>
      <Frame1 />
      <Frame2 />
    </div>
  );
}

function WeeklyStrip() {
  return (
    <div className="content-stretch flex flex-col h-[109px] items-start pb-[12px] relative shrink-0 w-full" data-name="weekly-strip">
      <Frame />
    </div>
  );
}

function PlantsListSection() {
  return (
    <div className="content-stretch flex flex-col h-[105px] items-start relative shrink-0 w-full" data-name="plants-list-section">
      <WeeklyStrip />
    </div>
  );
}

function SaveButton() {
  return (
    <div className="bg-[#00f078] content-stretch drop-shadow-[4px_4px_0px_#111] flex flex-[1_0_0] h-[56px] items-center justify-center min-w-px relative rounded-[100px]" data-name="save-button">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[14px] whitespace-nowrap">{`SAVE TO JUNGLE `}</p>
    </div>
  );
}

function SaveCtaWrapper() {
  return (
    <div className="content-stretch flex items-start pt-[8px] relative shrink-0 w-full" data-name="save-cta-wrapper">
      <SaveButton />
    </div>
  );
}

function SaveButton1() {
  return (
    <div className="bg-white content-stretch drop-shadow-[4px_4px_0px_#111] flex flex-[1_0_0] h-[41px] items-center justify-center min-w-px relative rounded-[100px]" data-name="save-button">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[12px] whitespace-nowrap">CANCEL</p>
    </div>
  );
}

function SaveCtaWrapper1() {
  return (
    <div className="content-stretch flex items-start pb-[40px] relative shrink-0 w-full" data-name="save-cta-wrapper">
      <SaveButton1 />
    </div>
  );
}

function FormBody() {
  return (
    <div className="relative shrink-0 w-full" data-name="form-body">
      <div className="content-stretch flex flex-col gap-[16px] items-start px-[20px] relative size-full">
        <PhotoUploadContainer />
        <InputsGroup />
        <BatchSelectorSection />
        <WaterNeedsSection />
        <PlantsListSection />
        <SaveCtaWrapper />
        <SaveCtaWrapper1 />
      </div>
    </div>
  );
}

function SheetContentGroup() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="sheet-content-group">
      <StatusBar />
      <ModalHeader />
      <FormBody />
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

function IconContainer6() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Home />
    </div>
  );
}

function TabIconWrapper() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer6 />
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

function IconContainer7() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Plus />
    </div>
  );
}

function TabIconWrapper1() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer7 />
    </div>
  );
}

function TabBtnAdd() {
  return (
    <div className="bg-[#d1ffe8] content-stretch flex flex-[1_0_0] flex-col gap-[4px] h-[68px] items-center justify-center min-w-px py-[4px] relative" data-name="tab-btn-add">
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

function IconContainer8() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Calendar />
    </div>
  );
}

function TabIconWrapper2() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer8 />
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

function IconContainer9() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Star />
    </div>
  );
}

function TabIconWrapper3() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer9 />
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

export default function MyjungleAddPlant() {
  return (
    <div className="bg-[#efefef] content-stretch flex flex-col items-start justify-between relative size-full" data-name="myjungle-add-plant">
      <SheetContentGroup />
      <TabBarContainer />
    </div>
  );
}