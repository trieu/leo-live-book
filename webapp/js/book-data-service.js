/**
 * ==========================================================
 * BookDataService
 * ----------------------------------------------------------
 * Rule:
 *   1 URL = 1 cache
 *
 * Features:
 *   - Per-URL cache
 *   - Per-URL single-flight loading
 *   - AJAX header token support
 *   - Callback-based API
 * ==========================================================
 */

window.BookDataService = (function ($) {

    // ======================================================
    // PRIVATE STATE
    // ======================================================

    /**
     * cacheMap = {
     *   [url]: {
     *     data: Object | null,
     *     loading: boolean,
     *     callbacks: Array<{ onSuccess, onError }>
     *   }
     * }
     */
    const cacheMap = {};

    const AUTH = {
        headerKey: null,
        tokenProvider: null
    };

    // ======================================================
    // INTERNAL HELPERS
    // ======================================================

    function getEntry(url) {
        if (!cacheMap[url]) {
            cacheMap[url] = {
                data: null,
                loading: false,
                callbacks: []
            };
        }
        return cacheMap[url];
    }

    function notifySuccess(entry, data) {
        entry.callbacks.forEach(cb => cb.onSuccess && cb.onSuccess(data));
        entry.callbacks = [];
    }

    function notifyError(entry, error) {
        entry.callbacks.forEach(cb => cb.onError && cb.onError(error));
        entry.callbacks = [];
    }

    function buildHeaders() {
        if (!AUTH.headerKey || !AUTH.tokenProvider) {
            return {};
        }

        const token =
            typeof AUTH.tokenProvider === "function"
                ? AUTH.tokenProvider()
                : AUTH.tokenProvider;

        if (!token) return {};

        return {
            [AUTH.headerKey]: token
        };
    }

    // ======================================================
    // PUBLIC API
    // ======================================================

    return {

        /**
         * Configure auth header
         *
         * @param {Object} options
         * @param {string} options.headerKey   e.g. "Authorization"
         * @param {string|Function} options.token
         *        - string: static token
         *        - function: () => token (dynamic)
         */
        setAuth(options = {}) {
            AUTH.headerKey = options.headerKey || null;
            AUTH.tokenProvider = options.token || null;
        },

        /**
         * Load book JSON by URL
         *
         * @param {string} url
         * @param {Object} callbacks
         * @param {Function} callbacks.onSuccess
         * @param {Function} callbacks.onError
         */
        getBookByUrl(url, { onSuccess, onError } = {}) {

            if (!url) {
                throw new Error("BookDataService.getBookByUrl requires a URL");
            }

            const entry = getEntry(url);

            // 1️⃣ Serve from cache
            if (entry.data) {
                onSuccess && onSuccess(entry.data);
                return;
            }

            // 2️⃣ Queue callback
            entry.callbacks.push({ onSuccess, onError });

            if (entry.loading) {
                return;
            }

            // 3️⃣ Single-flight request
            entry.loading = true;

            $.ajax({
                url: url,
                method: "GET",
                dataType: "json",
                cache: false,
                headers: buildHeaders(),

                success: function (json) {
                    console.log("✅ Book JSON loaded:", url);

                    entry.data = json;
                    entry.loading = false;

                    notifySuccess(entry, json);
                },

                error: function (xhr, status, err) {
                    console.error("❌ Failed to load book JSON:", url, err);

                    entry.loading = false;
                    notifyError(entry, err);
                }
            });
        },

        /**
         * Get cached data synchronously
         */
        getCached(url) {
            return cacheMap[url]?.data || null;
        },

        /**
         * Clear cache for one URL
         */
        clearCache(url) {
            if (url && cacheMap[url]) {
                delete cacheMap[url];
            }
        },

        /**
         * Clear all caches
         */
        clearAll() {
            Object.keys(cacheMap).forEach(k => delete cacheMap[k]);
        }
    };

})(jQuery);
