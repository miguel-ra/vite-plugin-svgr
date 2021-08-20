import fs from 'fs';
import esbuild from 'esbuild';

import type { Plugin } from 'vite';

// Use require to prevent missing declaration file typescript errors
const svgr = require('@svgr/core').default;

interface PluginOptions {
    keepEmittedAssets?: boolean;
}

export default function svgrPlugin(options: PluginOptions = {}): Plugin {
    const transformed: Array<string> = [];

    return {
        name: 'vite:svgr',

        async transform(code, id) {
            if (!id.endsWith('.svg?component')) {
                return null;
            }

            const svgDataPath = id.replace('?component', '');
            const svgData = await fs.promises.readFile(svgDataPath, 'utf8');
            const componentCode = await svgr(svgData, {}, { filePath: svgDataPath });
            const component = await esbuild.transform(componentCode, { loader: 'jsx' });

            transformed.push(id);

            return { code: component.code, map: null };
        },

        generateBundle(config, bundle) {
            if (options.keepEmittedAssets) {
                return;
            }

            // Discard transformed SVG assets from bundle so they are not emitted
            for (const [key, bundleEntry] of Object.entries(bundle)) {
                const { type, name } = bundleEntry;
                if (
                    type === 'asset' &&
                    name?.endsWith('.svg') &&
                    transformed.findIndex((id) => id.includes(name)) >= 0
                ) {
                    delete bundle[key];
                }
            }
        }
    };
}
