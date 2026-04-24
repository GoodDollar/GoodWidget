import{j as e}from"./index-eshTaYxd.js";import{C as d,H as n,T as i,B as f,a as A}from"./index-BhFQl1yt.js";import"./index-CracEMlZ.js";import"./index-C1DqdAOE.js";const F={title:"Primitives/Card",component:d,tags:["autodocs"],parameters:{layout:"padded"}},t={render:()=>e.jsxs(d,{"data-testid":"Card-default",style:{width:320},children:[e.jsx(n,{level:5,children:"Default Card"}),e.jsx(i,{children:"Uses base theme background, border, and shadow. Override via the Card component sub-theme."})]})},r={render:()=>e.jsxs(d,{"data-testid":"Card-withAction",style:{width:320},children:[e.jsx(n,{level:5,children:"Card with Action"}),e.jsx(i,{secondary:!0,children:"A card composed with a button child."}),e.jsx(f,{fullWidth:!0,children:e.jsx(A,{children:"Take Action"})})]})},a={render:()=>e.jsxs(d,{"data-testid":"Card-inline",backgroundColor:"#1A1A2E",borderColor:"#7B61FF",borderWidth:2,style:{width:320},children:[e.jsx(n,{level:4,color:"#E0E0FF",children:"Inline-styled Card"}),e.jsx(i,{color:"#B0B0D0",children:"Per-instance styling via inline props (highest specificity)."})]})};var s,o,c,l,h;t.parameters={...t.parameters,docs:{...(s=t.parameters)==null?void 0:s.docs,source:{originalSource:`{
  render: () => <Card data-testid="Card-default" style={{
    width: 320
  }}>
      <Heading level={5}>Default Card</Heading>
      <Text>
        Uses base theme background, border, and shadow. Override via the Card component sub-theme.
      </Text>
    </Card>
}`,...(c=(o=t.parameters)==null?void 0:o.docs)==null?void 0:c.source},description:{story:"Default Card using base theme values.",...(h=(l=t.parameters)==null?void 0:l.docs)==null?void 0:h.description}}};var p,u,m,C,x;r.parameters={...r.parameters,docs:{...(p=r.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => <Card data-testid="Card-withAction" style={{
    width: 320
  }}>
      <Heading level={5}>Card with Action</Heading>
      <Text secondary>A card composed with a button child.</Text>
      <Button fullWidth>
        <ButtonText>Take Action</ButtonText>
      </Button>
    </Card>
}`,...(m=(u=r.parameters)==null?void 0:u.docs)==null?void 0:m.source},description:{story:"Card with a child Button — composing primitives.",...(x=(C=r.parameters)==null?void 0:C.docs)==null?void 0:x.description}}};var y,g,b,v,w;a.parameters={...a.parameters,docs:{...(y=a.parameters)==null?void 0:y.docs,source:{originalSource:`{
  render: () => <Card data-testid="Card-inline" backgroundColor="#1A1A2E" borderColor="#7B61FF" borderWidth={2} style={{
    width: 320
  }}>
      <Heading level={4} color="#E0E0FF">
        Inline-styled Card
      </Heading>
      <Text color="#B0B0D0">Per-instance styling via inline props (highest specificity).</Text>
    </Card>
}`,...(b=(g=a.parameters)==null?void 0:g.docs)==null?void 0:b.source},description:{story:"Card styled with inline props — highest-specificity override layer.",...(w=(v=a.parameters)==null?void 0:v.docs)==null?void 0:w.description}}};const H=["Default","WithAction","InlineStyled"];export{t as Default,a as InlineStyled,r as WithAction,H as __namedExportsOrder,F as default};
