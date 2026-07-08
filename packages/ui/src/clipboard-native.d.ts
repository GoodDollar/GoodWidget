declare module '@react-native-clipboard/clipboard' {
  const Clipboard: {
    setString: (text: string) => void
    getString: () => Promise<string>
  }
  export default Clipboard
}
