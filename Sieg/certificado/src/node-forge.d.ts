declare module "node-forge" {
  export const asn1: { fromDer(binary: string): unknown };
  export const pkcs12: {
    pkcs12FromAsn1(asn1: unknown, password: string, strict?: boolean): {
      getBags(opts: { bagType: string }): Record<string, unknown[]>;
    };
  };
  export const pki: { oids: { certBag: string } };
}
