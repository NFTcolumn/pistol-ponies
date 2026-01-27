/**
 * Utility class for handling cross-browser Fullscreen API
 */
export class FullScreenUtils {
    /**
     * Request fullscreen for an element
     * @param {HTMLElement} element 
     */
    static request(element = document.documentElement) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            /* Safari */
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            /* IE11 */
            element.msRequestFullscreen();
        }
    }

    /**
     * Exit fullscreen mode
     */
    static exit() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            /* IE11 */
            document.msExitFullscreen();
        }
    }

    /**
     * Toggle fullscreen mode
     * @param {HTMLElement} element 
     */
    static toggle(element = document.documentElement) {
        if (!this.isFullscreen()) {
            this.request(element);
        } else {
            this.exit();
        }
    }

    /**
     * Check if document is currently in fullscreen
     * @returns {boolean}
     */
    static isFullscreen() {
        return !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
    }
}
