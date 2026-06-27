import { usbService } from "./UsbConnection";

function hexToBytes(hex: string): number[] {
  const lines = hex.split("\n");
  const bytes: number[] = [];

  for (const line of lines) {
    if (!line.startsWith(":")) continue;

    const length = parseInt(line.substr(1, 2), 16);
    const address = parseInt(line.substr(3, 4), 16);
    const type = parseInt(line.substr(7, 2), 16);

    if (type !== 0) continue;

    for (let i = 0; i < length; i++) {
      const byte = parseInt(line.substr(9 + i * 2, 2), 16);
      bytes[address + i] = byte;
    }
  }

  return bytes;
}

async function stk500Command(cmd: number[]) {
  await usbService.writeBytes(cmd);

  const res = await usbService.readBytes();
  return res.data;
}

export async function uploadHex(hex: string, baudRate = 115200) {
  console.log("Uploading with baud rate:", baudRate);

  const bytes = hexToBytes(hex);

  await usbService.stopReading();

  // reset again قبل upload
  await usbService.setDTR(false);
  await new Promise((r) => setTimeout(r, 100));
  await usbService.setDTR(true);
  await new Promise((r) => setTimeout(r, 800));

  // SYNC
  await stk500Command([0x30, 0x20]);

  // ENTER PROG MODE
  await stk500Command([0x50, 0x20]);

  let address = 0;
  const pageSize = 128;

  while (address < bytes.length) {
    const chunk = bytes.slice(address, address + pageSize);

    const addr = address / 2;
    await stk500Command([0x55, addr & 0xff, (addr >> 8) & 0xff, 0x20]);

    const size = chunk.length;

    await usbService.writeBytes([
      0x64,
      (size >> 8) & 0xff,
      size & 0xff,
      0x46,
      ...chunk,
      0x20,
    ]);

    await usbService.readBytes();

    address += pageSize;
  }

  await stk500Command([0x51, 0x20]);
}
