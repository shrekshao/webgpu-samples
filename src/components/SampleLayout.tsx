import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { GUI } from 'dat.gui';
import type { Editor, EditorConfiguration } from 'codemirror';
interface CodeMirrorEditor extends Editor {
  updatedSource: (source: string) => void;
}

import styles from './SampleLayout.module.css';

type SourceFileInfo = {
  name: string;
  contents: string;
  editable?: boolean;
};

export type SampleInit = (params: {
  canvas: HTMLCanvasElement;
  pageState: { active: boolean };
  gui?: GUI;
}) => void | Promise<void>;

if (process.browser) {
  require('codemirror/mode/javascript/javascript');
}

function makeCodeMirrorEditor(source: string) {
  const configuration: EditorConfiguration = {
    lineNumbers: true,
    lineWrapping: true,
    theme: 'monokai',
    readOnly: true,
  };

  let el: HTMLDivElement | null = null;
  let editor: CodeMirrorEditor;

  if (process.browser) {
    el = document.createElement('div');
    const CodeMirror = process.browser && require('codemirror');
    editor = CodeMirror(el, configuration);
  }

  function Container(props: React.ComponentProps<'div'>) {
    return (
      <div {...props}>
        <div
          ref={(div) => {
            if (el && div) {
              div.appendChild(el);
              editor.setOption('value', source);
            }
          }}
        />
      </div>
    );
  }
  return {
    Container,
  };
}

const SampleLayout: React.FunctionComponent<
  React.PropsWithChildren<{
    name: string;
    description: string;
    originTrial?: string;
    filename: string;
    gui?: boolean;
    init: SampleInit;
    sources: SourceFileInfo[];
  }>
> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sources = useMemo(
    () =>
      props.sources.map(({ name, contents }) => {
        return { name, ...makeCodeMirrorEditor(contents) };
      }),
    props.sources
  );

  const guiParentRef = useRef<HTMLDivElement | null>(null);
  const gui: GUI | undefined = useMemo(() => {
    if (props.gui && process.browser) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const dat = require('dat.gui');
      return new dat.GUI({ autoPlace: false });
    }
    return undefined;
  }, []);

  const router = useRouter();
  const currentHash = router.asPath.match(/#([a-zA-Z0-9\.\/]+)/);

  const [error, setError] = useState<unknown | null>(null);

  const [activeHash, setActiveHash] = useState<string | null>(null);
  useEffect(() => {
    if (currentHash) {
      setActiveHash(currentHash[1]);
    } else {
      setActiveHash(sources[0].name);
    }

    if (gui && guiParentRef.current) {
      guiParentRef.current.appendChild(gui.domElement);
    }

    const pageState = {
      active: true,
    };
    const cleanup = () => {
      pageState.active = false;
    };
    try {
      const canvas = canvasRef.current;
      const p = props.init({
        canvas,
        pageState,
        gui,
      });

      if (p instanceof Promise) {
        p.catch((err: Error) => {
          console.error(err);
          setError(err);
        });
      }
    } catch (err) {
      console.error(err);
      setError(err);
    }
    return cleanup;
  }, []);

  return (
    <main>
      <Head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .CodeMirror {
              height: auto !important;
              margin: 1em 0;
            }

            .CodeMirror-scroll {
              height: auto !important;
              overflow: visible !important;
            }
          `,
          }}
        />
        <title>{`${props.name} - WebGPU Samples`}</title>
        <meta name="description" content={props.description} />
        <meta httpEquiv="origin-trial" content={props.originTrial} />
      </Head>
      <div>
        <h1>{props.name}</h1>
        <a
          target="_blank"
          rel="noreferrer"
          href={`https://github.com/${process.env.REPOSITORY_NAME}/tree/main/${props.filename}`}
        >
          See it on Github!
        </a>
        <p>{props.description}</p>
        {error ? (
          <>
            <p>Is WebGPU Enabled?</p>
            <p>{`${error}`}</p>
          </>
        ) : null}
      </div>
      <div className={styles.canvasContainer}>
        <div
          style={{
            position: 'absolute',
            right: 10,
          }}
          ref={guiParentRef}
        ></div>
        <canvas ref={canvasRef}></canvas>
      </div>
      <div>
        <nav className={styles.sourceFileNav}>
          <ul>
            {sources.map((src, i) => {
              return (
                <li key={i}>
                  <a
                    href={`#${src.name}`}
                    data-active={activeHash == src.name}
                    onClick={() => {
                      setActiveHash(src.name);
                    }}
                  >
                    {src.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        {sources.map((src, i) => {
          return (
            <src.Container
              className={styles.sourceFileContainer}
              data-active={activeHash == src.name}
              key={i}
            />
          );
        })}
      </div>
    </main>
  );
};

export default SampleLayout;

export const makeSample: (
  ...props: Parameters<typeof SampleLayout>
) => JSX.Element = (props) => {
  return <SampleLayout {...props} />;
};
