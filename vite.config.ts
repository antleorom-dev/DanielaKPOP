import {defineConfig} from 'vite';
import {resolve} from 'node:path';

// Build both the existing game and the separate Blender-rig laboratory.
export default defineConfig({
  build:{
    rollupOptions:{
      input:{
        game:resolve(__dirname,'index.html'),
        lab:resolve(__dirname,'preview.html')
      }
    }
  }
});
