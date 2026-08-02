import svgPaths from "./svg-op7ttlkxgr";
import imgPhotoUploadContainer from "./06984fd808ab72dc75d1af5314ea222465c42869.png";
import imgInnerImageClip from "./24c699409182c3e5d2a17cf3bf10988ef662ca0c.png";

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

function ModalHeader() {
  return (
    <div className="relative shrink-0 w-full" data-name="modal-header">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-between pb-[36px] pt-[28px] px-[20px] relative size-full">
          <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[18px] uppercase whitespace-nowrap">Plant Details</p>
          <HeaderActions />
        </div>
      </div>
    </div>
  );
}

function PhotoUploadContainer() {
  return (
    <div className="h-[219px] relative rounded-[20px] shrink-0 w-full" data-name="photo-upload-container">
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[20px]">
        <img alt="" className="absolute h-[107.47%] left-0 max-w-none top-[-1.66%] w-full" src={imgPhotoUploadContainer} />
      </div>
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <div className="flex flex-row items-center size-full">
        <div className="relative size-full" />
      </div>
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

function TagBatch1() {
  return (
    <div className="bg-[#00f078] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[6px] shrink-0" data-name="tag-batch">
      <div aria-hidden className="absolute border border-[#111] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#111] text-[9px] whitespace-nowrap">{`WEDNESDAY `}</p>
    </div>
  );
}

function TagsRow() {
  return (
    <div className="content-stretch flex gap-[4px] items-start relative shrink-0" data-name="tags-row">
      <TagRoom />
      <TagBatch />
      <TagBatch1 />
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[13px] uppercase whitespace-nowrap">Pilea Peperomioides</p>
      <TagsRow />
    </div>
  );
}

function UploadAction() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="upload-action">
      <Frame1 />
      <div className="h-[15px] relative shrink-0 w-[16px]" data-name="Vector">
        <svg className="absolute block inset-0 size-full" fill="none" height="15" preserveAspectRatio="none" viewBox="0 0 16 15" width="16">
          <path d={svgPaths.p3c709780} fill="black" id="Vector" />
        </svg>
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start justify-center leading-[normal] relative shrink-0 text-[#111] w-full">
      <p className="font-['Unbounded:Black',sans-serif] font-black relative shrink-0 text-[11px] uppercase whitespace-nowrap">Care Note</p>
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[14px] w-[300px]">{`Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. `}</p>
    </div>
  );
}

function Droplet() {
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

function IconContainer1() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet />
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

function IconContainer3() {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-center relative shrink-0 w-[12px]" data-name="icon-container">
      <Droplet2 />
    </div>
  );
}

function Drops() {
  return (
    <div className="content-stretch flex gap-[5px] h-[16px] items-end relative shrink-0" data-name="drops">
      <IconContainer1 />
      <IconContainer2 />
      <IconContainer3 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start justify-center relative shrink-0">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[11px] uppercase whitespace-nowrap">Water Level</p>
      <Drops />
    </div>
  );
}

function Frame3() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start justify-center leading-[normal] relative shrink-0 text-[#111] whitespace-nowrap">
      <p className="font-['Unbounded:Black',sans-serif] font-black relative shrink-0 text-[11px] uppercase">Last Watered</p>
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[14px]">03.09.2026</p>
    </div>
  );
}

function Check() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
        <g id="check">
          <path d={svgPaths.p2afd9fa0} id="Vector" stroke="#111111" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconContainer4() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[18px]" data-name="icon-container">
      <Check />
    </div>
  );
}

function QuickWaterBtn() {
  return (
    <div className="bg-[#00f078] col-1 content-stretch flex items-center justify-center ml-[126px] mt-0 relative rounded-[100px] row-1 size-[40px]" data-name="quick-water-btn">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <IconContainer4 />
    </div>
  );
}

function Group() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
      <p className="[word-break:break-word] col-1 font-['Geist:Bold',sans-serif] font-bold leading-[normal] ml-0 mt-[11px] relative row-1 text-[#111] text-[12px] whitespace-nowrap">MARK AS WATERED</p>
      <QuickWaterBtn />
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex h-[24px] items-center justify-between relative shrink-0 w-full">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#ff0863] text-[14px] whitespace-nowrap">NEED WATER</p>
      <Group />
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start justify-center relative shrink-0 w-full">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#111] text-[11px] uppercase whitespace-nowrap">Status</p>
      <Frame5 />
    </div>
  );
}

function PhotoUploadContainer1() {
  return (
    <div className="bg-white relative rounded-[20px] shrink-0 w-full" data-name="photo-upload-container">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col gap-[24px] items-start justify-center p-[16px] relative size-full">
          <UploadAction />
          <Frame />
          <Frame2 />
          <Frame3 />
          <Frame4 />
        </div>
      </div>
    </div>
  );
}

function Frame6() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start justify-center leading-[normal] relative shrink-0 text-[#111] w-full">
      <p className="font-['Unbounded:Black',sans-serif] font-black relative shrink-0 text-[11px] uppercase whitespace-nowrap">gROWN HISTORY</p>
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[14px] w-[300px]">{`Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy `}</p>
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

function PlantMeta() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="plant-meta">
      <p className="font-['Unbounded:Black',sans-serif] font-black min-w-full overflow-hidden relative shrink-0 text-[#111] text-[12px] text-ellipsis w-[min-content] whitespace-nowrap">MONSTERA DELICIOSA</p>
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[#888] text-[14px] whitespace-nowrap">12.04.2024</p>
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[#111] text-[14px] w-[230px]">Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam.</p>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex gap-[16px] items-start relative shrink-0 w-full">
      <CloverFrameWrapper />
      <PlantMeta />
      <div className="relative shrink-0 size-[18px]" data-name="Vector">
        <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
          <path d={svgPaths.p31294280} fill="black" id="Vector" />
        </svg>
      </div>
      <div className="relative shrink-0 size-[19px]" data-name="Vector">
        <div className="absolute inset-[-5.26%]">
          <svg className="block size-full" fill="none" height="21" preserveAspectRatio="none" viewBox="0 0 21 21" width="21">
            <path d={svgPaths.p264e700} id="Vector" stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
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
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[36px] size-full" src={imgInnerImageClip} />
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

function PlantMeta1() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="plant-meta">
      <p className="font-['Unbounded:Black',sans-serif] font-black min-w-full overflow-hidden relative shrink-0 text-[#111] text-[12px] text-ellipsis w-[min-content] whitespace-nowrap">MONSTERA DELICIOSA</p>
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[#888] text-[14px] whitespace-nowrap">27.05.2024</p>
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[#111] text-[14px] w-[230px]">Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam.</p>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex gap-[16px] items-start relative shrink-0 w-full">
      <CloverFrameWrapper1 />
      <PlantMeta1 />
      <div className="relative shrink-0 size-[18px]" data-name="Vector">
        <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
          <path d={svgPaths.p31294280} fill="black" id="Vector" />
        </svg>
      </div>
      <div className="relative shrink-0 size-[19px]" data-name="Vector">
        <div className="absolute inset-[-5.26%]">
          <svg className="block size-full" fill="none" height="21" preserveAspectRatio="none" viewBox="0 0 21 21" width="21">
            <path d={svgPaths.p264e700} id="Vector" stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
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
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[36px] size-full" src={imgInnerImageClip} />
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

function PlantMeta2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="plant-meta">
      <p className="font-['Unbounded:Black',sans-serif] font-black min-w-full overflow-hidden relative shrink-0 text-[#111] text-[12px] text-ellipsis w-[min-content] whitespace-nowrap">MONSTERA DELICIOSA</p>
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[#888] text-[14px] whitespace-nowrap">23.07.2024</p>
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[#111] text-[14px] w-[230px]">Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam.</p>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex gap-[16px] items-start relative shrink-0 w-full">
      <CloverFrameWrapper2 />
      <PlantMeta2 />
      <div className="relative shrink-0 size-[18px]" data-name="Vector">
        <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
          <path d={svgPaths.p31294280} fill="black" id="Vector" />
        </svg>
      </div>
      <div className="relative shrink-0 size-[19px]" data-name="Vector">
        <div className="absolute inset-[-5.26%]">
          <svg className="block size-full" fill="none" height="21" preserveAspectRatio="none" viewBox="0 0 21 21" width="21">
            <path d={svgPaths.p264e700} id="Vector" stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Clover3() {
  return <div className="absolute left-0 size-[54px] top-0" data-name="clover" />;
}

function InnerImageClip3() {
  return (
    <div className="relative shrink-0 size-[54px]" data-name="inner-image-clip">
      <svg className="absolute block inset-0 size-full" fill="none" height="54" preserveAspectRatio="none" viewBox="0 0 54 54" width="54">
        <g id="inner-image-clip">
          <rect fill="#EFEFEF" height="54" rx="27" width="54" />
          <path d={svgPaths.p1a54b00} fill="black" id="Vector" />
        </g>
      </svg>
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

function PlantMeta3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-w-px relative" data-name="plant-meta">
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] overflow-hidden relative shrink-0 text-[#111] text-[12px] text-ellipsis w-full whitespace-nowrap">+ NEW STATUS</p>
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full">
      <CloverFrameWrapper3 />
      <PlantMeta3 />
    </div>
  );
}

function PhotoUploadContainer2() {
  return (
    <div className="bg-white relative rounded-[20px] shrink-0 w-full" data-name="photo-upload-container">
      <div aria-hidden className="absolute border-2 border-[#111] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col gap-[24px] items-start justify-center p-[16px] relative size-full">
          <Frame6 />
          <Frame7 />
          <Frame8 />
          <Frame9 />
          <Frame10 />
        </div>
      </div>
    </div>
  );
}

function SaveButton() {
  return (
    <div className="bg-white content-stretch flex flex-[1_0_0] h-[41px] items-center justify-center min-w-px relative rounded-[100px]" data-name="save-button">
      <div aria-hidden className="absolute border-2 border-[#ff0863] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Unbounded:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#ff0863] text-[12px] whitespace-nowrap">DELETE PLANT</p>
    </div>
  );
}

function SaveCtaWrapper1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px pb-[40px] relative" data-name="save-cta-wrapper">
      <SaveButton />
    </div>
  );
}

function SaveCtaWrapper() {
  return (
    <div className="content-stretch flex items-start pb-[20px] pt-[8px] relative shrink-0 w-full" data-name="save-cta-wrapper">
      <SaveCtaWrapper1 />
    </div>
  );
}

function FormBody() {
  return (
    <div className="relative shrink-0 w-full" data-name="form-body">
      <div className="content-stretch flex flex-col gap-[16px] items-start px-[20px] relative size-full">
        <PhotoUploadContainer />
        <PhotoUploadContainer1 />
        <PhotoUploadContainer2 />
        <SaveCtaWrapper />
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

function IconContainer5() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Home />
    </div>
  );
}

function TabIconWrapper() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer5 />
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

function IconContainer6() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Plus />
    </div>
  );
}

function TabIconWrapper1() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer6 />
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

function IconContainer7() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Calendar />
    </div>
  );
}

function TabIconWrapper2() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer7 />
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

function IconContainer8() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="icon-container">
      <Star />
    </div>
  );
}

function TabIconWrapper3() {
  return (
    <div className="content-stretch flex items-start px-[16px] py-[4px] relative rounded-[12px] shrink-0" data-name="tab-icon-wrapper">
      <IconContainer8 />
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