import{j as r}from"./index-eshTaYxd.js";import{C as i,c as D}from"./mockEip1193-CLJ2Kkzy.js";import{Y as o}from"./index-BhFQl1yt.js";import"./index-CracEMlZ.js";import"./index-C1DqdAOE.js";import"./index-CeZYpCY0.js";const d=D(),F={tokens:{color:{primary:"#2E5DE8",primaryDark:"#1D3EB2",primaryLight:"#6E8DFF"}},themes:{light_ClaimCard:{borderColor:"#2E5DE8",shadowColor:"rgba(46,93,232,0.7)"},light_ClaimActionGlow:{primary:"#4F7DFF",primaryLight:"#9DB4FF"},light_ClaimActionRing:{primary:"#2E5DE8",primaryLight:"#6E8DFF"},light_ClaimActionInner:{backgroundDark:"#0E1A3A",backgroundDarkHover:"#172B60"},light_TokenAmountText:{color:"#BBD0FF",secondaryColor:"#7FA2FF"}}},B={tokens:{color:{primary:"#00A884",primaryDark:"#007A61",primaryLight:"#33C9AA"}},themes:{light_ClaimCard:{borderColor:"#00A884",shadowColor:"rgba(0,168,132,0.65)"},light_ClaimActionGlow:{primary:"#33C9AA",primaryLight:"#78E0CB"},light_ClaimActionRing:{primary:"#00A884",primaryLight:"#33C9AA"},light_ClaimActionInner:{backgroundDark:"#062A23",backgroundDarkHover:"#0B3B31"},light_TokenAmountText:{color:"#BFF5E7",secondaryColor:"#66D5BB"}}},w={title:"Widgets/ClaimWidget",component:i,tags:["autodocs"],parameters:{layout:"padded"}},e={render:()=>r.jsx(o,{"data-testid":"ClaimWidget-default",style:{width:380},children:r.jsx(i,{provider:d})})},t={render:()=>r.jsx(o,{"data-testid":"ClaimWidget-cobalt",style:{width:380},children:r.jsx(i,{provider:d,themeOverrides:F})})},a={render:()=>r.jsx(o,{"data-testid":"ClaimWidget-teal",style:{width:380},children:r.jsx(i,{provider:d,themeOverrides:B})})};var s,n,l,m,c;e.parameters={...e.parameters,docs:{...(s=e.parameters)==null?void 0:s.docs,source:{originalSource:`{
  render: () => <YStack data-testid="ClaimWidget-default" style={{
    width: 380
  }}>
      <ClaimWidget provider={mockProvider} />
    </YStack>
}`,...(l=(n=e.parameters)==null?void 0:n.docs)==null?void 0:l.source},description:{story:"Default preset — no overrides, GoodWalletV2 baseline.",...(c=(m=e.parameters)==null?void 0:m.docs)==null?void 0:c.description}}};var p,g,h,C,k;t.parameters={...t.parameters,docs:{...(p=t.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => <YStack data-testid="ClaimWidget-cobalt" style={{
    width: 380
  }}>
      <ClaimWidget provider={mockProvider} themeOverrides={cobaltOverrides} />
    </YStack>
}`,...(h=(g=t.parameters)==null?void 0:g.docs)==null?void 0:h.source},description:{story:"Cobalt brand — token + component theme overrides via themeOverrides.",...(k=(C=t.parameters)==null?void 0:C.docs)==null?void 0:k.description}}};var v,y,u,A,b;a.parameters={...a.parameters,docs:{...(v=a.parameters)==null?void 0:v.docs,source:{originalSource:`{
  render: () => <YStack data-testid="ClaimWidget-teal" style={{
    width: 380
  }}>
      <ClaimWidget provider={mockProvider} themeOverrides={tealOverrides} />
    </YStack>
}`,...(u=(y=a.parameters)==null?void 0:y.docs)==null?void 0:u.source},description:{story:"Teal brand — a different brand palette via themeOverrides.",...(b=(A=a.parameters)==null?void 0:A.docs)==null?void 0:b.description}}};const S=["Default","CobaltBrand","TealBrand"];export{t as CobaltBrand,e as Default,a as TealBrand,S as __namedExportsOrder,w as default};
