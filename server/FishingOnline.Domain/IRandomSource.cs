namespace FishingOnline.Domain;

/// <summary>Mọi random của luật đi qua interface này để test cố định được.</summary>
public interface IRandomSource
{
    /// <summary>Số thực trong [0, 1).</summary>
    double NextDouble();

    int NextInt(int minInclusive, int maxInclusive);
}
