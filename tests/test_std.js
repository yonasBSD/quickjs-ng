import * as std from "qjs:std";
import * as os from "qjs:os";
import { assert } from  "./assert.js";

const isWin = os.platform === 'win32';
const isCygwin = os.platform === 'cygwin';


function test_printf()
{
    assert(std.sprintf("a=%d s=%s", 123, "abc"), "a=123 s=abc");
    assert(std.sprintf("%010d", 123), "0000000123");
    assert(std.sprintf("%x", -2), "fffffffe");
    assert(std.sprintf("%lx", -2), "fffffffffffffffe");
    assert(std.sprintf("%10.1f", 2.1), "       2.1");
    assert(std.sprintf("%*.*f", 10, 2, -2.13), "     -2.13");
    assert(std.sprintf("%#lx", 0x7fffffffffffffffn), "0x7fffffffffffffff");
}

function test_file1()
{
    var f, len, str, size, buf, ret, i, str1, ab;

    f = std.tmpfile();
    str = "hello world\n";
    f.puts(str);

    f.seek(0, std.SEEK_SET);
    ab = f.readAsArrayBuffer();
    assert([...new Uint8Array(ab)], str.split("").map(c => c.charCodeAt(0)));

    f.seek(0, std.SEEK_SET);
    str1 = f.readAsString();
    assert(str1, str);

    f.seek(0, std.SEEK_END);
    size = f.tell();
    assert(size, str.length);

    f.seek(0, std.SEEK_SET);

    buf = new Uint8Array(size);
    ret = f.read(buf.buffer, 0, size);
    assert(ret, size);
    for(i = 0; i < size; i++)
        assert(buf[i], str.charCodeAt(i));

    f.close();
}

function test_file2()
{
    var f, str, i, size;
    f = std.tmpfile();
    str = "hello world\n";
    size = str.length;
    for(i = 0; i < size; i++)
        f.putByte(str.charCodeAt(i));
    f.seek(0, std.SEEK_SET);
    for(i = 0; i < size; i++) {
        assert(str.charCodeAt(i), f.getByte());
    }
    assert(f.getByte(), -1);
    f.close();
}

function test_getline()
{
    var f, line, line_count, lines, i;

    lines = ["hello world", "line 1", "line 2" ];
    f = std.tmpfile();
    for(i = 0; i < lines.length; i++) {
        f.puts(lines[i], "\n");
    }

    f.seek(0, std.SEEK_SET);
    assert(!f.eof());
    line_count = 0;
    for(;;) {
        line = f.getline();
        if (line === null)
            break;
        assert(line, lines[line_count]);
        line_count++;
    }
    assert(f.eof());
    assert(line_count, lines.length);

    f.close();
}

function test_popen()
{
    var str, f, fname = "tmp_file.txt";
    var ta, content = "hello world";
    var cmd = isWin ? "type" : "cat";

    ta = new Uint8Array([...content].map(c => c.charCodeAt(0)));
    std.writeFile(fname, ta);
    assert(std.loadFile(fname), content);
    std.writeFile(fname, ta.buffer);
    assert(std.loadFile(fname), content);
    std.writeFile(fname, content);
    assert(std.loadFile(fname), content);

    // popen pipe is unidirectional so mode should
    // be either read or write but not both
    let caught = false;
    try {
        std.popen(cmd, "rw");
    } catch (e) {
        assert(/invalid file mode/.test(e.message));
        caught = true;
    }
    assert(caught);

    /* execute shell command */
    f = std.popen(cmd + " " + fname, "r");
    str = f.readAsString();
    f.close();

    assert(str, content);

    os.remove(fname);
}

function test_os()
{
    var fd, fpath, fname, fdir, buf, buf2, i, files, err, fdate, st, link_path;

    // XXX(bnoordhuis) disabled because stdio is not a tty on CI
    //assert(os.isatty(0));

    fdir = "test_tmp_dir";
    fname = "tmp_file.txt";
    fpath = fdir + "/" + fname;
    link_path = fdir + "/test_link";

    os.remove(link_path);
    os.remove(fpath);
    os.remove(fdir);

    err = os.mkdir(fdir, 0o755);
    assert(err, 0);

    fd = os.open(fpath, os.O_RDWR | os.O_CREAT | os.O_TRUNC);
    assert(fd >= 0);

    buf = new Uint8Array(10);
    for(i = 0; i < buf.length; i++)
        buf[i] = i;
    assert(os.write(fd, buf.buffer, 0, buf.length), buf.length);

    assert(os.seek(fd, 0, std.SEEK_SET), 0);
    buf2 = new Uint8Array(buf.length);
    assert(os.read(fd, buf2.buffer, 0, buf2.length), buf2.length);

    for(i = 0; i < buf.length; i++)
        assert(buf[i] == buf2[i]);

    if (typeof BigInt !== "undefined") {
        assert(os.seek(fd, BigInt(6), std.SEEK_SET), BigInt(6));
        assert(os.read(fd, buf2.buffer, 0, 1), 1);
        assert(buf[6] == buf2[0]);
    }

    assert(os.close(fd), 0);

    [files, err] = os.readdir(fdir);
    assert(err, 0);
    assert(files.length >= 3);
    assert(files.includes(fname));
    assert(files.includes("."));
    assert(files.includes(".."));

    fdate = 10000;

    err = os.utimes(fpath, fdate, fdate);
    assert(err, 0);

    [st, err] = os.stat(fpath);
    assert(err, 0);
    assert(st.mode & os.S_IFMT, os.S_IFREG);
    assert(st.mtime, fdate);

    if (!isWin) {
        err = os.symlink(fname, link_path);
        assert(err, 0);

        [st, err] = os.lstat(link_path);
        assert(err, 0);
        assert(st.mode & os.S_IFMT, os.S_IFLNK);

        [buf, err] = os.readlink(link_path);
        assert(err, 0);
        assert(buf, fname);

        assert(os.remove(link_path) === 0);
    }

    [buf, err] = os.getcwd();
    assert(err, 0);

    [buf2, err] = os.realpath(".");
    assert(err, 0);

    assert(buf, buf2);

    assert(os.remove(fpath) === 0);

    fd = os.open(fpath, os.O_RDONLY);
    assert(fd < 0);

    assert(os.remove(fdir) === 0);
}

function test_os_exec()
{
    var ret, fds, pid, f, status;

    ret = os.exec(["true"]);
    assert(ret, 0);

    ret = os.exec(["/bin/sh", "-c", "exit 1"], { usePath: false });
    assert(ret, 1);

    fds = os.pipe();
    pid = os.exec(["sh", "-c", "echo $FOO"], {
        stdout: fds[1],
        block: false,
        env: { FOO: "hello" },
    } );
    assert(pid >= 0);
    os.close(fds[1]); /* close the write end (as it is only in the child)  */
    f = std.fdopen(fds[0], "r");
    assert(f.getline(), "hello");
    assert(f.getline(), null);
    f.close();
    [ret, status] = os.waitpid(pid, 0);
    assert(ret, pid);
    assert(status & 0x7f, 0); /* exited */
    assert(status >> 8, 0); /* exit code */

    pid = os.exec(["cat"], { block: false } );
    assert(pid >= 0);
    os.kill(pid, os.SIGTERM);
    [ret, status] = os.waitpid(pid, 0);
    assert(ret, pid);
    // Flaky on cygwin for unclear reasons, see
    // https://github.com/quickjs-ng/quickjs/issues/184
    if (!isCygwin) {
        assert(status & 0x7f, os.SIGTERM);
    }
}

function test_interval()
{
    var t = os.setInterval(f, 1);
    function f() {
        if (++f.count === 3) os.clearInterval(t);
    }
    f.count = 0;
}

function test_timeout()
{
    var th, i;

    /* just test that a timer can be inserted and removed */
    th = [];
    for(i = 0; i < 3; i++)
        th[i] = os.setTimeout(function () { }, 1000);
    for(i = 0; i < 3; i++)
        os.clearTimeout(th[i]);
}

function test_timeout_order()
{
    var s = "";
    os.setTimeout(a, 0);
    os.setTimeout(b, 100);
    os.setTimeout(d, 700);
    function a() { s += "a"; os.setTimeout(c, 300); }
    function b() { s += "b"; }
    function c() { s += "c"; }
    function d() { assert(s, "abc"); } // not "acb"
}

function test_stdio_close()
{
    for (const f of [std.in, std.out, std.err]) {
        let caught = false;
        try {
            f.close();
        } catch (e) {
            assert(/cannot close stdio/.test(e.message));
            caught = true;
        }
        assert(caught);
    }
}

test_printf();
test_file1();
test_file2();
test_getline();
test_popen();
test_os();
!isWin && test_os_exec();
test_interval();
test_timeout();
test_timeout_order();
test_stdio_close();
