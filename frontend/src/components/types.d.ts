declare module '*.jsx' {
    const component: (props: any) => JSX.Element;
    export default component;
}

declare module '*.js' {
    const module: any;
    export default module;
}

export { };
