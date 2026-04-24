import{j as t}from"./index-eshTaYxd.js";import{b as a,C as g,H as x,Y as T}from"./index-BhFQl1yt.js";import"./index-CracEMlZ.js";import"./index-C1DqdAOE.js";const j={title:"Primitives/TokenAmount",component:a,tags:["autodocs"],parameters:{layout:"padded"},argTypes:{amount:{control:"text",description:"Token amount to display"},token:{control:"text",description:"Token ticker symbol"},size:{control:"select",options:["sm","md","lg","xl"],description:"Display size variant"},decimals:{control:"number",description:"Number of decimal places"}}},e={args:{amount:"1234.56",token:"G$"},render:k=>t.jsxs(g,{"data-testid":"TokenAmount-default",style:{width:320},children:[t.jsx(x,{level:5,children:"Amounts"}),t.jsxs(T,{gap:"$2",children:[t.jsx(a,{...k}),t.jsx(a,{amount:"0",token:"ETH"}),t.jsx(a,{amount:"1000000",token:"USDC"})]})]})},o={args:{amount:"42.00",token:"G$"}};var n,s,r,i,m;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    amount: '1234.56',
    token: 'G$'
  },
  render: args => <Card data-testid="TokenAmount-default" style={{
    width: 320
  }}>
      <Heading level={5}>Amounts</Heading>
      <YStack gap="$2">
        <TokenAmount {...args} />
        <TokenAmount amount="0" token="ETH" />
        <TokenAmount amount="1000000" token="USDC" />
      </YStack>
    </Card>
}`,...(r=(s=e.parameters)==null?void 0:s.docs)==null?void 0:r.source},description:{story:"Default token amount display.",...(m=(i=e.parameters)==null?void 0:i.docs)==null?void 0:m.description}}};var d,c,l,p,u;o.parameters={...o.parameters,docs:{...(d=o.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    amount: '42.00',
    token: 'G$'
  }
}`,...(l=(c=o.parameters)==null?void 0:c.docs)==null?void 0:l.source},description:{story:"Controllable instance — edit args in the Controls panel.",...(u=(p=o.parameters)==null?void 0:p.docs)==null?void 0:u.description}}};const b=["Default","Controllable"];export{o as Controllable,e as Default,b as __namedExportsOrder,j as default};
