import Head from "next/head";
import type { AppProps } from "next/app";
import "@/globals.css";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <>
            <Head>
                <title>React Photo Album - Next.JS</title>
                <meta name="description" content="Generated by create next app" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <header>
                <h1>React Photo Album | Next.JS</h1>
                <a href="https://github.com/igordanchenko/react-photo-album" target="_blank" rel="noreferrer noopener">
                    GitHub
                </a>
                <a href="https://react-photo-album.com/" target="_blank" rel="noreferrer noopener">
                    Docs
                </a>
            </header>

            <main>
                <Component {...pageProps} />
            </main>
        </>
    );
}