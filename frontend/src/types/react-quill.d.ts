declare module 'react-quill' {
  interface ReactQuillProps {
    theme?: string;
    value?: string;
    onChange?: (value: string) => void;
    modules?: {
      toolbar?: any[];
    };
    formats?: string[];
    style?: React.CSSProperties;
  }

  const ReactQuill: React.FC<ReactQuillProps>;
  export default ReactQuill;
}
