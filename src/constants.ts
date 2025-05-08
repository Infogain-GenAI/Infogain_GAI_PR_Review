type LanguageKey = 'js' | 'ts' | 'py' | 'go' | 'rb' | 'cs' | 'java' | 'php' | 'rs' | 'swift' | 'cpp' | 'c' | 'm' | 'mm' | 'h' | 'hpp' | 'hxx' | 'hh' | 'hxx' | 'hh'| 'cc'| 'cxx'| 'styl'| 'vue'| 'svelte'| 'jsx' | 'tsx'| 'toml'| 'clj'| 'cljs'| 'cljc'| 'edn'| 'lua'| 'r'| 'sql'| 'kt'| 'kts'| 'ktm'| 'ktx'| 'gradle'| 'tf'| 'scala'| 'sc'| 'html' | 'css' | 'scss' | 'less' | 'sass' | 'json' | 'xml' | 'yaml' | 'yml' | 'md' | 'txt' | 'sh' | 'bat' | 'ps1' | 'psm1' | 'psd1' | 'ps1xml' | 'pssc' | 'sc' | 'other';
export const extensionToLanguageMap: Record<LanguageKey, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  go: 'go',
  rb: 'ruby',
  cs: 'csharp',
  java: 'java',
  php: 'php',
  rs: 'rust',
  swift: 'swift',
  cpp: 'cpp',
  c: 'c',
  m: 'objective-c',
  mm: 'objective-cpp',
  h: 'c',
  hpp: 'cpp',
  hxx: 'cpp',
  hh: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  sass: 'sass',
  styl: 'stylus',
  vue: 'vue',
  svelte: 'svelte',
  jsx: 'jsx',
  tsx: 'tsx',
  md: 'markdown',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  toml: 'toml',
  sh: 'shell',
  clj: 'clojure',
  cljs: 'clojure',
  cljc: 'clojure',
  edn: 'clojure',
  lua: 'lua',
  sql: 'sql',
  r: 'r',
  kt: 'kotlin',
  kts: 'kotlin',
  ktm: 'kotlin',
  ktx: 'kotlin',
  gradle: 'groovy',
  tf: 'terraform',
  scala: 'scala',
  sc: 'scala',
  txt: "",
  bat: "",
  ps1: "",
  psm1: "",
  psd1: "",
  ps1xml: "",
  pssc: "",
  other: ""
}

export const systemPromptDotNetReviewer = `Act as an empathetic software engineer who is an expert in designing and developing
.NET and C sharp based applications and APIs by adhering to best practices of software architecture.`

export const systemPromptJavaReviewer = `Act as an empathetic software engineer who is an expert in designing and developing
Java and SpringBoot based applications and APIs by adhering to best practices of software architecture.`

export const systemPromptReactReduxReviewer = `Act as an empathetic software engineer who is an expert in designing and developing
React and Redux based applications and APIs by adhering to best practices of software architecture.`

export const systemPromptPythonReviewer = `Act as an empathetic software engineer who is an expert in designing and developing
Python applications and APIs by adhering to best practices of software architecture.`

export const systemPromptTypeScriptReviewer = `Act as an empathetic software engineer who is an expert in designing and developing
Typescript based applications and APIs by adhering to best practices of software architecture.`

export const systemPromptSecurityScannerCSharp = `Act as an empathetic advisory agent who is an expert in static ananlysis and reviews C# (.NET) code for
security vulnerabilities, misconfigurations, and insecure coding practices.`

export const systemPromptSecurityScannerJava = `Act as an empathetic advisory agent who is an expert in static ananlysis and reviews Java code for
security vulnerabilities, misconfigurations, and insecure coding practices.`

export const systemPromptSecurityScannerPython = `Act as an empathetic advisory agent who is an expert in static ananlysis and reviews Python code for
security vulnerabilities, misconfigurations, and insecure coding practices.`

export const instructionsPromptPrefix = `Your task is to review a Pull Request. You will receive a git diff.
Review it and suggest any based on the below coding standards and guidelines, and share your suggestions and code changes only for the guidelines which are not followed:`

export const instructionsPromptSuffix = `Write your reply and examples in GitHub Markdown format.
The programming language in the git diff is {lang}.
    git diff to review
    {diff}`