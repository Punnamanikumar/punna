"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const messages_1 = require("../messages");
class TraceFlags {
    constructor(connection) {
        this.LOG_TIMER_LENGTH_MINUTES = 30;
        this.MILLISECONDS_PER_MINUTE = 60000;
        this.connection = connection;
    }
    ensureTraceFlags() {
        return __awaiter(this, void 0, void 0, function* () {
            const username = this.connection.getUsername();
            if (!username) {
                throw new Error(messages_1.nls.localize('error_no_default_username'));
            }
            const userId = (yield this.getUserIdOrThrow(username)).Id;
            const traceFlag = yield this.getTraceFlagForUser(userId);
            if (traceFlag) {
                // update existing debug level and trace flag
                if (!(yield this.updateDebugLevel(traceFlag.DebugLevelId))) {
                    return false;
                }
                const expirationDate = this.calculateExpirationDate(traceFlag.ExpirationDate
                    ? new Date(traceFlag.ExpirationDate)
                    : new Date());
                return yield this.updateTraceFlag(traceFlag.Id, expirationDate);
            }
            else {
                // create a debug level
                const debugLevelId = yield this.createDebugLevel();
                if (!debugLevelId) {
                    throw new Error(messages_1.nls.localize('trace_flags_failed_to_create_debug_level'));
                }
                // create a trace flag
                const expirationDate = this.calculateExpirationDate(new Date());
                if (!(yield this.createTraceFlag(userId, debugLevelId, expirationDate))) {
                    return false;
                }
            }
            return true;
        });
    }
    updateDebugLevel(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const debugLevel = {
                Id: id,
                ApexCode: 'FINEST',
                Visualforce: 'FINER'
            };
            const result = (yield this.connection.tooling.update('DebugLevel', debugLevel));
            return result.success;
        });
    }
    createDebugLevel() {
        return __awaiter(this, void 0, void 0, function* () {
            const developerName = `ReplayDebuggerLevels${Date.now()}`;
            const debugLevel = {
                developerName,
                MasterLabel: developerName,
                ApexCode: 'FINEST',
                Visualforce: 'FINER'
            };
            const result = (yield this.connection.tooling.create('DebugLevel', debugLevel));
            return result.success && result.id ? result.id : undefined;
        });
    }
    updateTraceFlag(id, expirationDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const traceFlag = {
                Id: id,
                StartDate: Date.now(),
                ExpirationDate: expirationDate.toUTCString()
            };
            const result = (yield this.connection.tooling.update('TraceFlag', traceFlag));
            return result.success;
        });
    }
    createTraceFlag(userId, debugLevelId, expirationDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const traceFlag = {
                tracedentityid: userId,
                logtype: 'developer_log',
                debuglevelid: debugLevelId,
                StartDate: Date.now(),
                ExpirationDate: expirationDate.toUTCString()
            };
            const result = (yield this.connection.tooling.create('TraceFlag', traceFlag));
            return result.success && result.id ? result.id : undefined;
        });
    }
    isValidDateLength(expirationDate) {
        const currDate = new Date().valueOf();
        return (expirationDate.getTime() - currDate >
            this.LOG_TIMER_LENGTH_MINUTES * this.MILLISECONDS_PER_MINUTE);
    }
    calculateExpirationDate(expirationDate) {
        if (!this.isValidDateLength(expirationDate)) {
            expirationDate = new Date(Date.now() +
                this.LOG_TIMER_LENGTH_MINUTES * this.MILLISECONDS_PER_MINUTE);
        }
        return expirationDate;
    }
    getUserIdOrThrow(username) {
        return __awaiter(this, void 0, void 0, function* () {
            const userQuery = `SELECT id FROM User WHERE username='${username}'`;
            const userResult = yield this.connection.query(userQuery);
            if (userResult.totalSize === 0) {
                throw new Error(messages_1.nls.localize('trace_flags_unknown_user'));
            }
            return userResult.records[0];
        });
    }
    getTraceFlagForUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const traceFlagQuery = `
      SELECT id, logtype, startdate, expirationdate, debuglevelid, debuglevel.apexcode, debuglevel.visualforce
      FROM TraceFlag
      WHERE logtype='DEVELOPER_LOG' AND TracedEntityId='${userId}'
    `;
            const traceFlagResult = yield this.connection.tooling.query(traceFlagQuery);
            if (traceFlagResult.totalSize > 0) {
                return traceFlagResult.records[0];
            }
            return undefined;
        });
    }
}
exports.TraceFlags = TraceFlags;
//# sourceMappingURL=traceFlags.js.map