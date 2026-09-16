using System.Text;

namespace Hrms.Application.Common.Notifications;

/// <summary>
/// ประกอบข้อความ notification จาก template + ตัวแปร
///
/// <para>
/// <b>ทำไมไม่ต่อสตริงที่จุดเรียกเหมือนเดิม:</b> ลำดับคำของแต่ละภาษาไม่เหมือนกัน
/// (<c>คุณได้รับมอบหมายงาน {ticketNo}</c> / <c>You have been assigned {ticketNo}</c>)
/// ต่อสตริงไว้ก่อนแล้วแปลทีหลังไม่ได้ · ตรงกับกติกาใน CLAUDE.md ที่ห้ามต่อ string ข้ามภาษาฝั่ง frontend อยู่แล้ว
/// </para>
/// </summary>
public static class NotificationTemplate
{
    /// <summary>
    /// แทนตัวแปร <c>{ชื่อ}</c> ในเทมเพลต แล้ว <b>ตัดทั้งบรรทัดทิ้งถ้าตัวแปรในบรรทัดนั้นไม่มีค่า</b>
    ///
    /// <para>
    /// กติกาตัดบรรทัดมีไว้แทนของเดิมที่เขียนเป็น <c>x is null ? "" : $"\nเหตุผล: {x}"</c> ที่จุดเรียก —
    /// ถ้าปล่อยไว้แบบนั้น คำว่า "เหตุผล:" จะอยู่ในโค้ด C# ไม่ได้อยู่ในไฟล์คำแปล แล้วแปลไม่ได้
    /// บรรทัดที่ไม่มีตัวแปรเลยจะอยู่เสมอ
    /// </para>
    /// </summary>
    public static string Render(string template, IReadOnlyDictionary<string, string>? parameters)
    {
        var lines = template.Split('\n');
        var output = new List<string>(lines.Length);
        foreach (var line in lines)
        {
            var rendered = RenderLine(line, parameters, out var hadPlaceholder, out var anyEmpty);
            if (hadPlaceholder && anyEmpty) continue;
            output.Add(rendered);
        }
        return string.Join('\n', output);
    }

    private static string RenderLine(
        string line,
        IReadOnlyDictionary<string, string>? parameters,
        out bool hadPlaceholder,
        out bool anyEmpty)
    {
        hadPlaceholder = false;
        anyEmpty = false;
        var result = new StringBuilder(line.Length);
        for (var i = 0; i < line.Length; i++)
        {
            if (line[i] != '{')
            {
                result.Append(line[i]);
                continue;
            }
            var close = line.IndexOf('}', i + 1);
            if (close < 0)
            {
                result.Append(line[i]);
                continue;
            }
            var name = line[(i + 1)..close];
            hadPlaceholder = true;
            var value = parameters is not null && parameters.TryGetValue(name, out var found) ? found : string.Empty;
            if (string.IsNullOrWhiteSpace(value)) anyEmpty = true;
            result.Append(value);
            i = close;
        }
        return result.ToString();
    }

    /// <summary>
    /// แปลง anonymous object ที่จุดเรียกส่งมา (<c>new { ticketNo = …, title = … }</c>) เป็น dictionary
    /// ค่า <c>null</c> กลายเป็นสตริงว่าง เพื่อให้กติกาตัดบรรทัดข้างบนทำงาน
    /// </summary>
    public static Dictionary<string, string>? ToParams(object? values)
    {
        if (values is null) return null;
        if (values is IReadOnlyDictionary<string, string> dictionary) return new Dictionary<string, string>(dictionary);
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var property in values.GetType().GetProperties())
        {
            var value = property.GetValue(values);
            result[property.Name] = value switch
            {
                null => string.Empty,
                string text => text,
                IFormattable formattable => formattable.ToString(null, System.Globalization.CultureInfo.InvariantCulture),
                _ => value.ToString() ?? string.Empty,
            };
        }
        return result;
    }
}
