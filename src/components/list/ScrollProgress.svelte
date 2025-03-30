<script lang="ts">
  import { scrollProgress } from '$helpers/scrollStore.ts';
</script>

<div class="progress-container">
  <div class="progress-background"></div>
  <div class="progress-bar" style="width: {$scrollProgress}%"></div>
</div>

<style>
  .progress-container {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 6px;
    overflow: hidden;
    z-index: 10;
  }

  .progress-background {
    position: absolute;
    width: 100%;
    height: 100%;
    background-color: white;
  }

  .progress-bar {
    position: absolute;
    height: 100%;
    background: linear-gradient(to right, rgba(255, 215, 0, 0.8) 0%, #FFD700 60%, #FFC107 100%);
    box-shadow: 0 0 8px 1px rgba(255, 215, 0, 0.7);
    transition: width 0.2s ease-out;
  }

  @media (max-width: 1024px) {
    .progress-container {
      height: 4px;
    }

    .progress-bar {
      box-shadow: 0 0 6px 1px rgba(255, 215, 0, 0.6);
    }
  }
</style>
