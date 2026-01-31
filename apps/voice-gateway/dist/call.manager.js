"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCall = createCall;
const crypto_1 = require("crypto");
function createCall() {
    return (0, crypto_1.randomUUID)();
}
