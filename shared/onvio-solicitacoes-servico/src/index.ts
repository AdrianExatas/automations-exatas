export {
  addAttachment,
  addTopic,
  createTicket,
  deleteTicket,
  normalizeTicketIdForDelete,
  openServiceRequest,
  openTicket,
  OnvioApiError,
  uploadTicketWithAttachments,
} from "./core/service-request-api";
export {
  loadEmpresasFromExcel,
  loadServiceRequestsFromExcel,
  resolveEmpresasInput,
  resolveServiceRequestsInput,
} from "./input";
export {
  sendServiceRequestsBatch,
  uploadOnvioBatch,
} from "./send-service-requests-batch";
export { DEFAULT_BD_API_BASE_URL } from "./constants";
export {
  buildLegacyUnecontDescription,
  buildLegacyUnecontSubject,
  legacyUnecontDefaultContent,
} from "./adapters/unecont/service-request-helpers";
export { BdApiIdentifierProvider, loadBdLookupData } from "./providers/bd-api";
export type {
  BatchInput,
  EmpresaBatchItem,
  OpenServiceRequestOptions,
  OpenTicketOptions,
  ServiceRequestAttachment,
  ServiceRequestAttachmentStrategy,
  ServiceRequestBatchInput,
  ServiceRequestBatchItemResult,
  ServiceRequestBatchResult,
  ServiceRequestDefaultContent,
  ServiceRequestIdentifierLookupData,
  ServiceRequestIdentifierProvider,
  ServiceRequestMode,
  ServiceRequestRow,
  SendServiceRequestsOptions,
  SendServiceRequestsProgressEvent,
  UploadBatchItemResult,
  UploadBatchResult,
  UploadOnvioOptions,
  UploadTicketAttachment,
  UploadTicketOptions,
} from "./types";
