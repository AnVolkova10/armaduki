declare module 'papaparse' {
  export interface ParseResult<T> {
    data: T[];
    errors: any[];
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      truncated: boolean;
      cursor: number;
    };
  }

  export interface ParseConfig {
    download?: boolean;
    header?: boolean;
    complete?: (results: ParseResult<any>) => void;
    error?: (error: Error) => void;
  }

  export function parse<T>(input: string, config?: ParseConfig): ParseResult<T>;
  
  const Papa: {
    parse: typeof parse;
  };
  
  export default Papa;
}
