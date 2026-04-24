import{j as e}from"./index-eshTaYxd.js";import{r as h}from"./index-CracEMlZ.js";import{w as m,u as w,e as g}from"./index-C-ir4fTv.js";import{C as x,H as f,T as s,B as n,a as o,D,Y as B}from"./index-BhFQl1yt.js";import"./index-C1DqdAOE.js";const C={title:"Primitives/Drawer",tags:["autodocs"],parameters:{layout:"padded"}},r={render:()=>{const[a,t]=h.useState(!1);return e.jsxs(x,{"data-testid":"Drawer-trigger",style:{width:320},children:[e.jsx(f,{level:5,children:"Trigger"}),e.jsx(s,{children:"A Drawer slides up from the bottom and overlays the content."}),e.jsx(n,{fullWidth:!0,onPress:()=>t(!0),children:e.jsx(o,{children:"Open Drawer"})}),e.jsx(D,{open:a,onClose:()=>t(!1),children:e.jsxs(B,{gap:"$4",children:[e.jsx(s,{children:"Drawer content. Close via the button below or tap outside."}),e.jsx(n,{fullWidth:!0,onPress:()=>t(!1),children:e.jsx(o,{children:"Close"})})]})})]})},play:async({canvasElement:a})=>{const t=m(a),p=t.getByRole("button",{name:/open drawer/i});await w.click(p),await g(t.getByRole("button",{name:/close/i})).toBeDefined()}};var i,l,c,d,u;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:`{
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(false);
    return <Card data-testid="Drawer-trigger" style={{
      width: 320
    }}>
        <Heading level={5}>Trigger</Heading>
        <Text>A Drawer slides up from the bottom and overlays the content.</Text>
        <Button fullWidth onPress={() => setOpen(true)}>
          <ButtonText>Open Drawer</ButtonText>
        </Button>
        <Drawer open={open} onClose={() => setOpen(false)}>
          <YStack gap="$4">
            <Text>Drawer content. Close via the button below or tap outside.</Text>
            <Button fullWidth onPress={() => setOpen(false)}>
              <ButtonText>Close</ButtonText>
            </Button>
          </YStack>
        </Drawer>
      </Card>;
  },
  /** Interaction test: click "Open Drawer" and verify the Drawer opens. */
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', {
      name: /open drawer/i
    });
    await userEvent.click(trigger);
    // After clicking, the Close button should appear inside the Drawer
    await expect(canvas.getByRole('button', {
      name: /close/i
    })).toBeDefined();
  }
}`,...(c=(l=r.parameters)==null?void 0:l.docs)==null?void 0:c.source},description:{story:"Controlled Drawer triggered by a button.",...(u=(d=r.parameters)==null?void 0:d.docs)==null?void 0:u.description}}};const k=["Default"];export{r as Default,k as __namedExportsOrder,C as default};
