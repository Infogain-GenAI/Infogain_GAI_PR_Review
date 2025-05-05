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

export const systemPrompt = 'Act as an empathetic software engineer who is an expert in designing and developing Java and Springboot based applications by adhering to best practices of software architecture.'

export const instructionsPromptPrefix = `Your task is to review a Pull Request. You will receive a git diff.
Review it and suggest any improvements in code quality, maintainability, readability, performance, security, etc. Identify any potential bugs or security vulnerabilities. Check it adheres to the following coding standards and guidelines:`

export const instructionsPromptSuffix = `Write your reply and examples in GitHub Markdown format.
The programming language in the git diff is {lang}.
    git diff to review
    {diff}`