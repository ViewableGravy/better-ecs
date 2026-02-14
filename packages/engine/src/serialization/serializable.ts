// packages/engine/src/serialization/index.ts
import invariant from "tiny-invariant";

type Type = "u8" | "u16" | "u32" | "f32" | "f64" | "string" | "boolean";

export class Serializable {
  static serializableFields = new Map<Function, Array<[property: string, type: Type]>>();

  public to(type: "json" | "binary"): Record<string, unknown> | ArrayBuffer {
    switch (type) {
      case "json":
        return this.toJSON();
      case "binary":
        return this.toBinary();
      default:
        throw new Error(`Unsupported serialization type: ${type}`);
    }
  }

  private toJSON(): Record<string, unknown> {
    const fields = (this.constructor as any).serializableFields.get(this.constructor) || [];
    const result: any = {};
    for (const field of fields) {
      result[field] = (this as any)[field];
    }
    return result;
  }

  private toBinary(): ArrayBuffer {
    const fields = (this.constructor as any).serializableFields.get(this.constructor) || [];

    // Calculate the required buffer size
    let size = 0;
    for (const [property, type] of fields) {
      switch (type) {
        case "u8":
        case "boolean":
          size += 1;
          break;
        case "u16":
          size += 2;
          break;
        case "u32":
        case "f32":
          size += 4;
          break;
        case "f64":
          size += 8;
          break;
        case "string": {
          const str = (this as any)[property] as string;
          size += 4 + str.length; // 4 bytes for length + string data
          break;
        }
      }
    }

    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    let offset = 0;

    // Write each field
    for (const [property, type] of fields) {
      const value = (this as any)[property];

      switch (type) {
        case "u8":
          view.setUint8(offset, value);
          offset += 1;
          break;
        case "u16":
          view.setUint16(offset, value, true);
          offset += 2;
          break;
        case "u32":
          view.setUint32(offset, value, true);
          offset += 4;
          break;
        case "f32":
          view.setFloat32(offset, value, true);
          offset += 4;
          break;
        case "f64":
          view.setFloat64(offset, value, true);
          offset += 8;
          break;
        case "boolean":
          view.setUint8(offset, value ? 1 : 0);
          offset += 1;
          break;
        case "string": {
          const str = value as string;
          view.setUint32(offset, str.length, true);
          offset += 4;
          for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
          }
          offset += str.length;
          break;
        }
      }
    }

    return buffer;
  }
}

export function serializable(type: Type) {
  function decorator(_: any, context: ClassFieldDecoratorContext) {
    if (!Serializable.serializableFields.has(context.addInitializer)) {
      Serializable.serializableFields.set(context.addInitializer, []);
    }
    const fields = Serializable.serializableFields.get(context.addInitializer);
    invariant(fields, "Serializable invariant violated: missing serializable field registry");
    fields.push([context.name as string, type]);
  }

  return decorator;
}
