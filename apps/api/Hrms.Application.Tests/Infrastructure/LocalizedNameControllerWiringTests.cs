using System.Reflection;
using System.Text;
using FluentAssertions;
using MediatR;

namespace Hrms.Application.Tests.Infrastructure;

/// <summary>
/// ยามเฝ้าชั้น controller ของชื่อหลายภาษา (i18n Phase M)
///
/// ปัญหาที่เคยเกิด: command ใน Hrms.Application รับ NameEn/NameId ครบแล้ว และ handler บันทึกถูกต้อง
/// แต่ controller ใน Hrms.Api ยังใช้ request record เดิมที่ไม่มีสองฟิลด์นี้ ค่าที่ผู้ใช้กรอกจึงถูกทิ้ง
/// ตั้งแต่ก่อนเข้า command โดยที่ compiler ไม่เตือน เพราะทั้งสองฟิลด์เป็น optional parameter ท้าย record
///
/// เทสต์นี้อ่านซอร์สของ controller ตรง ๆ (โปรเจกต์เทสต์ไม่ได้อ้างอิง Hrms.Api) แล้วยืนยันว่า
/// ทุกจุดที่สร้าง command ซึ่งรองรับชื่อหลายภาษา ต้องส่ง NameEn และ NameId ไปด้วย
/// </summary>
public class LocalizedNameControllerWiringTests
{
    [Fact]
    public void EveryControllerCallSite_ShouldPassLocalizedNames()
    {
        var localizedCommands = typeof(Hrms.Application.Common.Interfaces.IApplicationDbContext).Assembly
            .GetTypes()
            .Where(type => type.Name.EndsWith("Command", StringComparison.Ordinal))
            .Where(type => type.GetInterfaces().Any(i =>
                i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IRequest<>)))
            .Where(type => type.GetProperty("NameEn", BindingFlags.Public | BindingFlags.Instance) is not null)
            .Select(type => type.Name)
            .ToHashSet(StringComparer.Ordinal);

        localizedCommands.Should().NotBeEmpty("ต้องเจอ command ที่รองรับชื่อหลายภาษาอย่างน้อย 1 ตัว มิฉะนั้นเทสต์นี้ไม่ได้ตรวจอะไรเลย");

        var offenders = new List<string>();
        foreach (var file in Directory.GetFiles(ControllersDirectory(), "*.cs", SearchOption.AllDirectories))
        {
            var source = File.ReadAllText(file);
            foreach (var command in localizedCommands)
            {
                foreach (var (arguments, line) in ConstructorCalls(source, command))
                {
                    var passesEn = arguments.Contains("NameEn", StringComparison.Ordinal);
                    var passesId = arguments.Contains("NameId", StringComparison.Ordinal);
                    if (passesEn && passesId) continue;

                    var missing = (passesEn, passesId) switch
                    {
                        (false, false) => "NameEn + NameId",
                        (false, true) => "NameEn",
                        _ => "NameId"
                    };
                    offenders.Add($"{Path.GetFileName(file)}:{line} — {command} ไม่ได้ส่ง {missing}");
                }
            }
        }

        offenders.Should().BeEmpty(
            "ทุกจุดที่สร้าง command ของ master data ต้องส่งชื่อหลายภาษาต่อไปด้วย ไม่งั้นค่าที่ผู้ใช้กรอกจะหายเงียบ ๆ");
    }

    /// <summary>คืน argument list ของทุกจุดที่เขียน <c>new CommandName(...)</c> พร้อมเลขบรรทัด</summary>
    private static IEnumerable<(string Arguments, int Line)> ConstructorCalls(string source, string commandName)
    {
        var token = $"new {commandName}(";
        var index = source.IndexOf(token, StringComparison.Ordinal);
        while (index >= 0)
        {
            var open = index + token.Length;
            var depth = 1;
            var cursor = open;
            var buffer = new StringBuilder();
            while (cursor < source.Length && depth > 0)
            {
                var ch = source[cursor];
                if (ch == '(') depth++;
                else if (ch == ')') depth--;
                if (depth > 0) buffer.Append(ch);
                cursor++;
            }

            var line = source.Take(index).Count(ch => ch == '\n') + 1;
            yield return (buffer.ToString(), line);
            index = source.IndexOf(token, cursor, StringComparison.Ordinal);
        }
    }

    /// <summary>ไต่ขึ้นจากโฟลเดอร์ผลลัพธ์ของเทสต์ไปหา apps/api/Hrms.Api/Controllers</summary>
    private static string ControllersDirectory()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var candidate = Path.Combine(directory.FullName, "Hrms.Api", "Controllers");
            if (Directory.Exists(candidate)) return candidate;
            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException("หาโฟลเดอร์ Hrms.Api/Controllers ไม่เจอจาก " + AppContext.BaseDirectory);
    }
}
