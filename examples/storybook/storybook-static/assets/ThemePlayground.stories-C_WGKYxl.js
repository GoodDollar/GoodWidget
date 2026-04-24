import{j as e}from"./index-eshTaYxd.js";import{C as n,c as G}from"./mockEip1193-CLJ2Kkzy.js";import{Y as s,A as d,C as l,H as c,T as g}from"./index-BhFQl1yt.js";import"./index-CracEMlZ.js";import"./index-C1DqdAOE.js";import"./index-CeZYpCY0.js";const m=G(),N={title:"Theme/ThemePlayground",tags:["autodocs"],parameters:{layout:"padded"}},r={render:()=>e.jsxs(s,{gap:"$4",style:{width:400},children:[e.jsx(d,{type:"info",title:"Preset Baseline",message:"No runtime overrides. The GoodWalletV2 preset drives all tokens, themes, and component sub-themes."}),e.jsx(n,{provider:m})]})},t={render:()=>e.jsxs(s,{gap:"$4",style:{width:400},children:[e.jsx(d,{type:"warning",title:"Token Override",message:"Token overrides are broad. Updating primary cascades through derived theme values and components that consume those semantics."}),e.jsxs(l,{children:[e.jsx(c,{level:5,children:"How it works"}),e.jsx(g,{variant:"caption",children:`<ClaimWidget
  config={{
    tokens: {
      color: { primary: '#4F7DFF', primaryDark: '#2E5DE8', primaryLight: '#7FA4FF' }
    }
  }}
/>`})]}),e.jsx(n,{provider:m,config:{tokens:{color:{primary:"#4F7DFF",primaryDark:"#2E5DE8",primaryLight:"#7FA4FF"}}}})]})},i={render:()=>e.jsxs(s,{gap:"$4",style:{width:400},children:[e.jsx(d,{type:"warning",title:"Component Theme Override",message:"Targeted overrides via named component sub-themes. Intended for widget authors, not public host integrators."}),e.jsxs(l,{children:[e.jsx(c,{level:5,children:"How it works"}),e.jsx(g,{variant:"caption",children:`<ClaimWidget
  config={{
    themes: {
      light_ClaimActionGlow: { primary: '#12cb31', primaryLight: '#9A4DFF' },
      light_ClaimActionRing: { primary: '#ff3333', primaryLight: '#9A4DFF' },
      light_ClaimActionInner: { backgroundDark: 'orange' },
    }
  }}
/>`})]}),e.jsx(n,{provider:m,config:{themes:{light_ClaimActionGlow:{primary:"#12cb31",primaryLight:"#9A4DFF"},light_ClaimActionRing:{primary:"#ff3333",primaryLight:"#9A4DFF"},light_ClaimActionInner:{backgroundDark:"orange",backgroundDarkHover:"red"},light_TokenAmountText:{color:"red",secondaryColor:"#3fbdf2"}}}})]})},o={render:()=>e.jsxs(s,{gap:"$4",style:{width:400},children:[e.jsx(d,{type:"warning",title:"Host themeOverrides — Cobalt",message:"themeOverrides are the public integrator API. Merged last, they win over preset + author config."}),e.jsxs(l,{children:[e.jsx(c,{level:5,children:"How it works"}),e.jsx(g,{variant:"caption",children:`<ClaimWidget
  themeOverrides={{
    tokens: { color: { primary: '#2E5DE8', ... } },
    themes: {
      light_ClaimCard: { borderColor: '#2E5DE8' },
      ...
    }
  }}
/>`})]}),e.jsx(n,{provider:m,themeOverrides:{tokens:{color:{primary:"#2E5DE8",primaryDark:"#1D3EB2",primaryLight:"#6E8DFF"}},themes:{light_ClaimCard:{borderColor:"#2E5DE8",shadowColor:"rgba(46,93,232,0.7)"},light_ClaimActionGlow:{primary:"#4F7DFF",primaryLight:"#9DB4FF"},light_ClaimActionRing:{primary:"#2E5DE8",primaryLight:"#6E8DFF"},light_ClaimActionInner:{backgroundDark:"#0E1A3A",backgroundDarkHover:"#172B60"},light_TokenAmountText:{color:"#BBD0FF",secondaryColor:"#7FA2FF"}}}})]})},a={render:()=>e.jsxs(s,{gap:"$4",style:{width:400},children:[e.jsx(d,{type:"info",title:"Host themeOverrides — Teal",message:"A different brand palette applied via themeOverrides. Same API, different brand."}),e.jsx(n,{provider:m,themeOverrides:{tokens:{color:{primary:"#00A884",primaryDark:"#007A61",primaryLight:"#33C9AA"}},themes:{light_ClaimCard:{borderColor:"#00A884",shadowColor:"rgba(0,168,132,0.65)"},light_ClaimActionGlow:{primary:"#33C9AA",primaryLight:"#78E0CB"},light_ClaimActionRing:{primary:"#00A884",primaryLight:"#33C9AA"},light_ClaimActionInner:{backgroundDark:"#062A23",backgroundDarkHover:"#0B3B31"},light_TokenAmountText:{color:"#BFF5E7",secondaryColor:"#66D5BB"}}}})]})};var p,h,y,v,C;r.parameters={...r.parameters,docs:{...(p=r.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => <YStack gap="$4" style={{
    width: 400
  }}>
      <Alert type="info" title="Preset Baseline" message="No runtime overrides. The GoodWalletV2 preset drives all tokens, themes, and component sub-themes." />
      <ClaimWidget provider={mockProvider} />
    </YStack>
}`,...(y=(h=r.parameters)==null?void 0:h.docs)==null?void 0:y.source},description:{story:`Default preset — the GoodWalletV2 base design system, no runtime overrides.
This is what every widget instance looks like out of the box.`,...(C=(v=r.parameters)==null?void 0:v.docs)==null?void 0:C.description}}};var k,A,u,F,D;t.parameters={...t.parameters,docs:{...(k=t.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: () => <YStack gap="$4" style={{
    width: 400
  }}>
      <Alert type="warning" title="Token Override" message="Token overrides are broad. Updating primary cascades through derived theme values and components that consume those semantics." />
      <Card>
        <Heading level={5}>How it works</Heading>
        <Text variant="caption">
          {\`<ClaimWidget
  config={{
    tokens: {
      color: { primary: '#4F7DFF', primaryDark: '#2E5DE8', primaryLight: '#7FA4FF' }
    }
  }}
/>\`}
        </Text>
      </Card>
      <ClaimWidget provider={mockProvider} config={{
      tokens: {
        color: {
          primary: '#4F7DFF',
          primaryDark: '#2E5DE8',
          primaryLight: '#7FA4FF'
        }
      }
    }} />
    </YStack>
}`,...(u=(A=t.parameters)==null?void 0:A.docs)==null?void 0:u.source},description:{story:`Token overrides — broad changes via \`config.tokens\`.

Tokens are static design primitives (palette, scale, spacing). Changing a
token cascades through every theme and component that consumes it.
Use this layer for brand-wide color changes.`,...(D=(F=t.parameters)==null?void 0:F.docs)==null?void 0:D.description}}};var b,w,f,T,x;i.parameters={...i.parameters,docs:{...(b=i.parameters)==null?void 0:b.docs,source:{originalSource:`{
  render: () => <YStack gap="$4" style={{
    width: 400
  }}>
      <Alert type="warning" title="Component Theme Override" message="Targeted overrides via named component sub-themes. Intended for widget authors, not public host integrators." />
      <Card>
        <Heading level={5}>How it works</Heading>
        <Text variant="caption">
          {\`<ClaimWidget
  config={{
    themes: {
      light_ClaimActionGlow: { primary: '#12cb31', primaryLight: '#9A4DFF' },
      light_ClaimActionRing: { primary: '#ff3333', primaryLight: '#9A4DFF' },
      light_ClaimActionInner: { backgroundDark: 'orange' },
    }
  }}
/>\`}
        </Text>
      </Card>
      <ClaimWidget provider={mockProvider} config={{
      themes: {
        light_ClaimActionGlow: {
          primary: '#12cb31',
          primaryLight: '#9A4DFF'
        },
        light_ClaimActionRing: {
          primary: '#ff3333',
          primaryLight: '#9A4DFF'
        },
        light_ClaimActionInner: {
          backgroundDark: 'orange',
          backgroundDarkHover: 'red'
        },
        light_TokenAmountText: {
          color: 'red',
          secondaryColor: '#3fbdf2'
        }
      }
    }} />
    </YStack>
}`,...(f=(w=i.parameters)==null?void 0:w.docs)==null?void 0:f.source},description:{story:`Component sub-theme override — targeted via \`config.themes\`.

Named components in GoodWidget (e.g. ClaimCard, ClaimActionGlow) opt into
named component sub-themes. Overriding \`light_ClaimActionGlow\` only affects
that specific named component, not the whole widget.

These overrides are intended for widget *authors*, not host integrators.`,...(x=(T=i.parameters)==null?void 0:T.docs)==null?void 0:x.description}}};var E,_,O,H,j;o.parameters={...o.parameters,docs:{...(E=o.parameters)==null?void 0:E.docs,source:{originalSource:`{
  render: () => <YStack gap="$4" style={{
    width: 400
  }}>
      <Alert type="warning" title="Host themeOverrides — Cobalt" message="themeOverrides are the public integrator API. Merged last, they win over preset + author config." />
      <Card>
        <Heading level={5}>How it works</Heading>
        <Text variant="caption">
          {\`<ClaimWidget
  themeOverrides={{
    tokens: { color: { primary: '#2E5DE8', ... } },
    themes: {
      light_ClaimCard: { borderColor: '#2E5DE8' },
      ...
    }
  }}
/>\`}
        </Text>
      </Card>
      <ClaimWidget provider={mockProvider} themeOverrides={{
      tokens: {
        color: {
          primary: '#2E5DE8',
          primaryDark: '#1D3EB2',
          primaryLight: '#6E8DFF'
        }
      },
      themes: {
        light_ClaimCard: {
          borderColor: '#2E5DE8',
          shadowColor: 'rgba(46,93,232,0.7)'
        },
        light_ClaimActionGlow: {
          primary: '#4F7DFF',
          primaryLight: '#9DB4FF'
        },
        light_ClaimActionRing: {
          primary: '#2E5DE8',
          primaryLight: '#6E8DFF'
        },
        light_ClaimActionInner: {
          backgroundDark: '#0E1A3A',
          backgroundDarkHover: '#172B60'
        },
        light_TokenAmountText: {
          color: '#BBD0FF',
          secondaryColor: '#7FA2FF'
        }
      }
    }} />
    </YStack>
}`,...(O=(_=o.parameters)==null?void 0:_.docs)==null?void 0:O.source},description:{story:`Host themeOverrides — the public integrator API.

\`themeOverrides\` are the runtime override layer exposed to host applications.
They are merged last and win over the preset and widget-author config.
Use this layer when embedding a GoodWidget in your own dapp or wallet.`,...(j=(H=o.parameters)==null?void 0:H.docs)==null?void 0:j.description}}};var B,L,S,P,W;a.parameters={...a.parameters,docs:{...(B=a.parameters)==null?void 0:B.docs,source:{originalSource:`{
  render: () => <YStack gap="$4" style={{
    width: 400
  }}>
      <Alert type="info" title="Host themeOverrides — Teal" message="A different brand palette applied via themeOverrides. Same API, different brand." />
      <ClaimWidget provider={mockProvider} themeOverrides={{
      tokens: {
        color: {
          primary: '#00A884',
          primaryDark: '#007A61',
          primaryLight: '#33C9AA'
        }
      },
      themes: {
        light_ClaimCard: {
          borderColor: '#00A884',
          shadowColor: 'rgba(0,168,132,0.65)'
        },
        light_ClaimActionGlow: {
          primary: '#33C9AA',
          primaryLight: '#78E0CB'
        },
        light_ClaimActionRing: {
          primary: '#00A884',
          primaryLight: '#33C9AA'
        },
        light_ClaimActionInner: {
          backgroundDark: '#062A23',
          backgroundDarkHover: '#0B3B31'
        },
        light_TokenAmountText: {
          color: '#BFF5E7',
          secondaryColor: '#66D5BB'
        }
      }
    }} />
    </YStack>
}`,...(S=(L=a.parameters)==null?void 0:L.docs)==null?void 0:S.source},description:{story:"Host themeOverrides — Teal brand variant.",...(W=(P=a.parameters)==null?void 0:P.docs)==null?void 0:W.description}}};const V=["DefaultPreset","TokenOverride","ComponentThemeOverride","HostOverrideCobalt","HostOverrideTeal"];export{i as ComponentThemeOverride,r as DefaultPreset,o as HostOverrideCobalt,a as HostOverrideTeal,t as TokenOverride,V as __namedExportsOrder,N as default};
