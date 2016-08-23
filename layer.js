"use strict";

class Line
{
	constructor(p1, p2, r, g)
	{
		this.m_p1 = p1;
		this.m_p2 = p2;
		this.m_radius = r;
		this.m_gap = g;
	}

	equals(l)
	{
		return this.m_radius === l.m_radius
				&& this.m_gap === l.m_gap
				&& equal_2d(this.m_p1, l.m_p1)
				&& equal_2d(this.m_p2, l.m_p2);
	}
}

function bucket_index(b, l)
{
	for (var i = 0; i < b.length; i++)
	{
		if (l.equals(b[i].m_line)) return i;
	}
	return -1;
}

class Record
{
	constructor(id, l)
	{
		this.m_id = id;
		this.m_line = l;
		var pv = perp_2d(sub_2d(l.m_p2, l.m_p1));
		this.m_lv_norm = scale_2d(pv, 1.0 / length_2d(pv));
		this.m_lv_dist = dot_2d(this.m_lv_norm, l.m_p1);
	}

	hit(l, d)
	{
		var dp1 = dot_2d(this.m_lv_norm, l.m_p1) - this.m_lv_dist;
		var dp2 = dot_2d(this.m_lv_norm, l.m_p2) - this.m_lv_dist;
		if (dp1 > d && dp2 > d) return false;
		if (dp1 < -d && dp2 < -d) return false;
		return collide_thick_lines_2d(l.m_p1, l.m_p2, this.m_line.m_p1, this.m_line.m_p2, d);
	}
}

class Layer
{
	constructor(dims, s)
	{
		this.m_width = dims[0];
		this.m_height = dims[1];
		this.m_scale = s;
		this.m_test = 0;
		this.m_buckets = [];
		for (var i = 0; i < (this.m_height * this.m_width); ++i) this.m_buckets.push([]);
	}

	get_aabb(l)
	{
		var x1 = l.m_p1[0];
		var y1 = l.m_p1[1];
		var x2 = l.m_p2[0];
		var y2 = l.m_p2[1];
		if (x1 > x2) var t = x1, x1 = x2, x2 = t;
		if (y1 > y2) var t = y1, y1 = y2, y2 = t;
		var r = l.m_radius + l.m_gap;
		var minx = Math.trunc((x1 - r) * this.m_scale);
		var miny = Math.trunc((y1 - r) * this.m_scale);
		var maxx = Math.trunc((x2 + r) * this.m_scale);
		var maxy = Math.trunc((y2 + r) * this.m_scale);
		minx = Math.max(0, minx);
		miny = Math.max(0, miny);
		maxx = Math.max(0, maxx);
		maxy = Math.max(0, maxy);
		minx = Math.min(this.m_width - 1, minx);
		maxx = Math.min(this.m_width - 1, maxx);
		miny = Math.min(this.m_height - 1, miny);
		maxy = Math.min(this.m_height - 1, maxy);
		return [minx, miny, maxx, maxy];
	}

	add_line(l)
	{
		var bb = this.get_aabb(l);
		var r = new Record(0, l);
		for (var y = bb[1]; y <= bb[3]; ++y)
		{
			for (var x = bb[0]; x <= bb[2]; ++x)
			{
				this.m_buckets[y * this.m_width + x].push(r);
			}
		}
	}

	sub_line(l)
	{
		var bb = this.get_aabb(l);
		for (var y = bb[1]; y <= bb[3]; ++y)
		{
			for (var x = bb[0]; x <= bb[2]; ++x)
			{
				var b = this.m_buckets[y * this.m_width + x];
				var index = bucket_index(b, l);
				if (index !== -1) b.splice(index, 1);
			}
		}
	}

	hit_line(l)
	{
		this.m_test += 1;
		var bb = this.get_aabb(l);
		for (var y = bb[1]; y <= bb[3]; ++y)
		{
			for (var x = bb[0]; x <= bb[2]; ++x)
			{
				var b = this.m_buckets[y * this.m_width + x];
				for (var i = 0; i < b.length; i++)
				{
					var record = b[i];
					if (record.m_id === this.m_test) continue;
					record.m_id = this.m_test;
					var d = l.m_radius + record.m_line.m_radius + Math.max(l.m_gap, record.m_line.m_gap);
					if (record.hit(l, d)) return true;
				}
			}
		}
		return false;
	}
}

class Layers
{
	constructor(dims, s)
	{
		this.m_depth = dims[2];
		this.m_layers = [];
		for (var z = 0; z < this.m_depth; ++z)
			this.m_layers.push(new Layer([dims[0], dims[1]], s));
	}

	add_line(p1, p2, r, g)
	{
		var z1 = Math.trunc(p1[2]);
		var z2 = Math.trunc(p2[2]);
		if (z1 > z2) var t = z1, z1 = z2, z2 = t;
		var l = new Line([p1[0], p1[1]], [p2[0], p2[1]], r, g);
		for (var z = z1; z <= z2; ++z) this.m_layers[z].add_line(l);
	}

	sub_line(p1, p2, r, g)
	{
		var z1 = Math.trunc(p1[2]);
		var z2 = Math.trunc(p2[2]);
		if (z1 > z2) var t = z1, z1 = z2, z2 = t;
		var l = new Line([p1[0], p1[1]], [p2[0], p2[1]], r, g);
		for (var z = z1; z <= z2; ++z) this.m_layers[z].sub_line(l);
	}

	hit_line(p1, p2, r, g)
	{
		var z1 = Math.trunc(p1[2]);
		var z2 = Math.trunc(p2[2]);
		if (z1 > z2) var t = z1, z1 = z2, z2 = t;
		var l = new Line([p1[0], p1[1]], [p2[0], p2[1]], r, g);
		for (var z = z1; z <= z2; ++z) if (this.m_layers[z].hit_line(l)) return true;
		return false;
	}
}
