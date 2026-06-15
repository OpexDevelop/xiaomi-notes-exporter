def read_varint(data: bytes, pos: int):
    val = 0
    shift = 0
    while True:
        b = data[pos]
        pos += 1
        val |= (b & 0x7f) << shift
        if not (b & 0x80):
            break
        shift += 7
    return val, pos

def parse_proto(data: bytes, start: int = 0, end: int = None):
    if end is None:
        end = len(data)
    msg = {}
    pos = start
    while pos < end:
        if pos >= len(data):
            break
        try:
            key, pos = read_varint(data, pos)
        except IndexError:
            break
        tag = key >> 3
        wire_type = key & 0x07
        
        if wire_type == 0:
            val, pos = read_varint(data, pos)
            msg.setdefault(tag, []).append(val)
        elif wire_type == 2:
            length, pos = read_varint(data, pos)
            val = data[pos:pos+length]
            pos += length
            msg.setdefault(tag, []).append(val)
        elif wire_type == 1:
            val = f"64bit_hex:0x{data[pos:pos+8].hex()}"
            pos += 8
            msg.setdefault(tag, []).append(val)
        elif wire_type == 5:
            val = f"32bit_hex:0x{data[pos:pos+4].hex()}"
            pos += 4
            msg.setdefault(tag, []).append(val)
        else:
            break
    return msg, pos

def safe_decode(bytes_data):
    if not isinstance(bytes_data, bytes):
        return bytes_data
    try:
        return bytes_data.decode('utf-8')
    except Exception:
        pass
    return f"hex:0x{bytes_data.hex()}"