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

	equal(l)
	{
		return this.m_radius === l.m_radius
				&& this.m_gap === l.m_gap
				&& equal_2d(this.m_p1, l.m_p1)
				&& equal_2d(this.m_p2, l.m_p2);
	}
}

function bucket_index(b, l)
{
	for (let i = 0; i < b.length; i++)
	{
		if (l.equal(b[i].m_line)) return i;
	}
	return -1;
}

class Record
{
	constructor(id, l)
	{
		this.m_id = id;
		this.m_line = l;
		let pv = perp_2d(sub_2d(l.m_p2, l.m_p1));
		this.m_lv_norm = scale_2d(pv, 1.0 / length_2d(pv));
		this.m_lv_dist = dot_2d(this.m_lv_norm, l.m_p1);
	}

	hit(l, d)
	{
		let dp1 = dot_2d(this.m_lv_norm, l.m_p1) - this.m_lv_dist;
		let dp2 = dot_2d(this.m_lv_norm, l.m_p2) - this.m_lv_dist;
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
		for (let i = 0; i < (this.m_height * this.m_width); ++i) this.m_buckets.push([]);
	}

	get_aabb(l)
	{
		let x1 = l.m_p1[0];
		let y1 = l.m_p1[1];
		let x2 = l.m_p2[0];
		let y2 = l.m_p2[1];
		if (x1 > x2) {let t = x1, x1 = x2, x2 = t};
		if (y1 > y2) {let t = y1, y1 = y2, y2 = t};
		let r = l.m_radius + l.m_gap;
		let minx = Math.trunc((x1 - r) * this.m_scale);
		let miny = Math.trunc((y1 - r) * this.m_scale);
		let maxx = Math.trunc((x2 + r) * this.m_scale);
		let maxy = Math.trunc((y2 + r) * this.m_scale);
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
		let bb = this.get_aabb(l);
		let r = new Record(0, l);
		for (let y = bb[1]; y <= bb[3]; ++y)
		{
			for (let x = bb[0]; x <= bb[2]; ++x)
			{
				this.m_buckets[y * this.m_width + x].push(r);
			}
		}
	}

	sub_line(l)
	{
		let bb = this.get_aabb(l);
		for (let y = bb[1]; y <= bb[3]; ++y)
		{
			for (let x = bb[0]; x <= bb[2]; ++x)
			{
				let b = this.m_buckets[y * this.m_width + x];
				let index = bucket_index(b, l);
				if (index !== -1) b.splice(index, 1);
			}
		}
	}

	hit_line(l)
	{
		this.m_test += 1;
		let bb = this.get_aabb(l);
		for (let y = bb[1]; y <= bb[3]; ++y)
		{
			for (let x = bb[0]; x <= bb[2]; ++x)
			{
				let b = this.m_buckets[y * this.m_width + x];
				for (let i = 0; i < b.length; i++)
				{
					let record = b[i];
					if (record.m_id === this.m_test) continue;
					record.m_id = this.m_test;
					let d = l.m_radius + record.m_line.m_radius + Math.max(l.m_gap, record.m_line.m_gap);
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
		for (let z = 0; z < this.m_depth; ++z)
			this.m_layers.push(new Layer([dims[0], dims[1]], s));
	}

	add_line(p1, p2, r, g)
	{
		let z1 = Math.trunc(p1[2]);
		let z2 = Math.trunc(p2[2]);
		if (z1 > z2) {let t = z1, z1 = z2, z2 = t};
		let l = new Line([p1[0], p1[1]], [p2[0], p2[1]], r, g);
		for (let z = z1; z <= z2; ++z) this.m_layers[z].add_line(l);
	}

	sub_line(p1, p2, r, g)
	{
		let z1 = Math.trunc(p1[2]);
		let z2 = Math.trunc(p2[2]);
		if (z1 > z2) {let t = z1, z1 = z2, z2 = t};
		let l = new Line([p1[0], p1[1]], [p2[0], p2[1]], r, g);
		for (let z = z1; z <= z2; ++z) this.m_layers[z].sub_line(l);
	}

	hit_line(p1, p2, r, g)
	{
		let z1 = Math.trunc(p1[2]);
		let z2 = Math.trunc(p2[2]);
		if (z1 > z2) {let t = z1, z1 = z2, z2 = t};
		let l = new Line([p1[0], p1[1]], [p2[0], p2[1]], r, g);
		for (let z = z1; z <= z2; ++z) if (this.m_layers[z].hit_line(l)) return true;
		return false;
	}
}
