"""
Minimal recursive-descent parser for the restricted JS-object-literal dialect
used in Jess Li - Portfolio.dc.html (unquoted keys, single/double/backtick
strings, arrays, objects, numbers, true/false/null). Good enough for this
file's data literals; not a general JS parser.
"""
import re

class QStr(str):
    """A str subclass that also remembers where it was in the source
    (start/end span INCLUDING the quote chars) and which quote char was used,
    so a later pass can splice in a replacement without re-parsing."""
    def __new__(cls, value, start, end, quote):
        obj = str.__new__(cls, value)
        obj.start = start
        obj.end = end
        obj.quote = quote
        return obj


class P:
    def __init__(self, s, pos=0):
        self.s = s
        self.pos = pos

    def skip_ws(self):
        s, n = self.s, len(self.s)
        while self.pos < n:
            c = s[self.pos]
            if c in ' \t\r\n':
                self.pos += 1
            elif c == '/' and self.pos+1 < n and s[self.pos+1] == '/':
                nl = s.find('\n', self.pos)
                self.pos = nl if nl != -1 else n
            else:
                break

    def peek(self):
        return self.s[self.pos] if self.pos < len(self.s) else ''

    def parse_value(self):
        self.skip_ws()
        c = self.peek()
        if c == '{':
            return self.parse_object()
        if c == '[':
            return self.parse_array()
        if c in ("'", '"', '`'):
            return self.parse_string()
        if c and (c.isdigit() or c in '+-'):
            return self.parse_atom()
        m = re.match(r'(true|false|null)\b', self.s[self.pos:])
        if m:
            self.pos += m.end()
            return m.group(0)
        # Fallback: an arbitrary JS expression (ternary, &&, function call, etc).
        # Scan raw text up to the next top-level ',' '}' or ']', respecting
        # nested (), [], {}, and string literals so we don't stop early.
        return self.parse_raw_expr()

    def parse_raw_expr(self):
        start = self.pos
        depth = 0
        s = self.s
        n = len(s)
        while self.pos < n:
            c = s[self.pos]
            if c in ("'", '"', '`'):
                self.parse_string()
                continue
            if c in '([{':
                depth += 1
                self.pos += 1
                continue
            if c in ')]}':
                if depth == 0:
                    break
                depth -= 1
                self.pos += 1
                continue
            if c == ',' and depth == 0:
                break
            self.pos += 1
        return {'__raw__': s[start:self.pos]}

    def parse_string(self):
        start = self.pos
        q = self.s[self.pos]
        self.pos += 1
        out = []
        s = self.s
        while True:
            c = s[self.pos]
            if c == '\\':
                out.append(c)
                out.append(s[self.pos+1])
                self.pos += 2
                continue
            if c == q:
                self.pos += 1
                break
            out.append(c)
            self.pos += 1
        return QStr(''.join(out), start, self.pos, q)

    def parse_atom(self):
        m = re.match(r'[-+]?[0-9][0-9.eE+-]*', self.s[self.pos:])
        if m:
            self.pos += m.end()
            return m.group(0)
        m = re.match(r'[A-Za-z_$][A-Za-z0-9_$]*', self.s[self.pos:])
        if m:
            self.pos += m.end()
            return m.group(0)
        raise ValueError(f'cannot parse atom at {self.pos}: ...{self.s[self.pos:self.pos+40]!r}')

    def parse_key(self):
        self.skip_ws()
        c = self.peek()
        if c in ("'", '"'):
            return self.parse_string()
        m = re.match(r'[A-Za-z_$][A-Za-z0-9_$]*', self.s[self.pos:])
        if not m:
            raise ValueError(f'cannot parse key at {self.pos}: ...{self.s[self.pos:self.pos+40]!r}')
        self.pos += m.end()
        return m.group(0)

    def parse_object(self):
        assert self.peek() == '{'
        self.pos += 1
        obj = {}
        while True:
            self.skip_ws()
            if self.peek() == '}':
                self.pos += 1
                break
            key = self.parse_key()
            self.skip_ws()
            assert self.peek() == ':', f'expected : at {self.pos} near {self.s[self.pos:self.pos+40]!r}'
            self.pos += 1
            val = self.parse_value()
            obj[key] = val
            self.skip_ws()
            if self.peek() == ',':
                self.pos += 1
                continue
            elif self.peek() == '}':
                self.pos += 1
                break
        return obj

    def parse_array(self):
        assert self.peek() == '['
        self.pos += 1
        arr = []
        while True:
            self.skip_ws()
            if self.peek() == ']':
                self.pos += 1
                break
            val = self.parse_value()
            arr.append(val)
            self.skip_ws()
            if self.peek() == ',':
                self.pos += 1
                continue
            elif self.peek() == ']':
                self.pos += 1
                break
        return arr


def parse(s, start=0):
    p = P(s, start)
    val = p.parse_value()
    return val, p.pos
