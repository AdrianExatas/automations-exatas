declare module "node-forge" {
  const forge: {
    asn1: {
      fromDer: (binary: string) => unknown;
    };
    pkcs12: {
      pkcs12FromAsn1: (asn1: unknown, password: string, strict: boolean) => {
        getBags: (options: { bagType: string }) => Record<string, unknown[]>;
      };
    };
    pki: {
      oids: {
        certBag: string;
      };
    };
  };
  export default forge;
}
